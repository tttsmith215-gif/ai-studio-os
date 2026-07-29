// ─── AI Studio OS: Rendering Pipeline ───────────────────────────
// Two modes:
//   1. `encode_frames` — takes a directory of PNG frames → MP4
//   2. `render_composition` — renders shape-only compositions headlessly
//      (text is handled by the frontend Canvas renderer)

use image::RgbaImage;
use imageproc::drawing;
use imageproc::point::Point;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

// ─── Types ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderComposition {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub total_frames: u32,
    pub background: String,
    pub layers: Vec<RenderLayer>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderLayer {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub layer_type: String,
    pub enabled: bool,
    pub transform: RenderTransform,
    pub keyframes: Vec<RenderKeyframe>,
    pub content: RenderContent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderTransform {
    pub x: f64,
    pub y: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub rotation: f64,
    pub opacity: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderKeyframe {
    pub frame: u32,
    pub props: serde_json::Value,
    pub easing: String,
    pub bezier: Option<[f64; 4]>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderContent {
    pub kind: String,
    // shape fields
    pub shape: Option<String>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub fill: Option<String>,
    pub stroke: Option<String>,
    pub stroke_width: Option<f64>,
    pub corner_radius: Option<f64>,
    // text fields (used by frontend Canvas, not rendered here)
    pub text: Option<String>,
    pub font_size: Option<f64>,
    pub font_family: Option<String>,
    pub color: Option<String>,
    pub align: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RenderResult {
    pub path: String,
    pub frames: u32,
    pub width: u32,
    pub height: u32,
    pub duration_secs: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct RenderProgress {
    pub frame: u32,
    pub total: u32,
    pub phase: String,
    pub message: String,
}

// ─── Hex colour ─────────────────────────────────────────────────

fn parse_hex(hex: &str) -> (u8, u8, u8, u8) {
    let s = hex.trim_start_matches('#');
    let len = s.len();
    let val = u64::from_str_radix(s, 16).unwrap_or(0);
    match len {
        3 => {
            let r = ((val >> 8) & 0xF) as u8 * 17;
            let g = ((val >> 4) & 0xF) as u8 * 17;
            let b = (val & 0xF) as u8 * 17;
            (r, g, b, 255)
        }
        4 => {
            let r = ((val >> 12) & 0xF) as u8 * 17;
            let g = ((val >> 8) & 0xF) as u8 * 17;
            let b = ((val >> 4) & 0xF) as u8 * 17;
            let a = (val & 0xF) as u8 * 17;
            (r, g, b, a)
        }
        6 => {
            let r = ((val >> 16) & 0xFF) as u8;
            let g = ((val >> 8) & 0xFF) as u8;
            let b = (val & 0xFF) as u8;
            (r, g, b, 255)
        }
        8 => {
            let r = ((val >> 24) & 0xFF) as u8;
            let g = ((val >> 16) & 0xFF) as u8;
            let b = ((val >> 8) & 0xFF) as u8;
            let a = (val & 0xFF) as u8;
            (r, g, b, a)
        }
        _ => (255, 255, 255, 255),
    }
}

fn hex_to_rgba(hex: &str) -> image::Rgba<u8> {
    let (r, g, b, a) = parse_hex(hex);
    image::Rgba([r, g, b, a])
}

// ─── Easing ──────────────────────────────────────────────────────

fn apply_easing(t: f64, easing: &str, bezier: &Option<[f64; 4]>) -> f64 {
    match easing {
        "linear" => t,
        "ease" if t < 0.5 => 2.0 * t * t,
        "ease" => -1.0 + (4.0 - 2.0 * t) * t,
        "ease-in" => t * t,
        "ease-out" => t * (2.0 - t),
        "bezier" => bezier.map(|[x1, y1, x2, y2]| cubic_bezier(t, x1, y1, x2, y2)).unwrap_or(t),
        _ => t,
    }
}

fn cubic_bezier(t: f64, x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    let mut guess = t;
    for _ in 0..8 {
        let x = 3.0 * (1.0 - guess).powi(2) * guess * x1
            + 3.0 * (1.0 - guess) * guess.powi(2) * x2 + guess.powi(3) - t;
        if x.abs() < 1e-6 {
            break;
        }
        let dx = 3.0 * (1.0 - guess).powi(2) * x1
            + 6.0 * (1.0 - guess) * guess * (x2 - x1) + 3.0 * guess.powi(2) * (1.0 - x2);
        if dx.abs() < 1e-6 {
            break;
        }
        guess -= x / dx;
    }
    3.0 * (1.0 - guess).powi(2) * guess * y1
        + 3.0 * (1.0 - guess) * guess.powi(2) * y2 + guess.powi(3)
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

// ─── Interpolation ──────────────────────────────────────────────

fn interpolate_transform(base: &RenderTransform, keyframes: &[RenderKeyframe], frame: u32) -> RenderTransform {
    if keyframes.is_empty() {
        return base.clone();
    }
    let mut result = base.clone();
    let mut prev = &keyframes[keyframes.len() - 1];
    let mut next = &keyframes[0];
    for kf in keyframes {
        if kf.frame <= frame {
            prev = kf;
        }
        if kf.frame > frame {
            next = kf;
            break;
        }
    }
    if prev.frame == next.frame || frame <= prev.frame || frame >= next.frame {
        let snap = if frame <= prev.frame { prev } else { next };
        apply_props(&mut result, snap);
        return result;
    }
    let t = (frame - prev.frame) as f64 / (next.frame - prev.frame) as f64;
    let eased = apply_easing(t, &prev.easing, &prev.bezier);
    lerp_props(&mut result, prev, next, eased);
    result
}

fn apply_props(r: &mut RenderTransform, kf: &RenderKeyframe) {
    macro_rules! apply {
        ($key:literal, $field:ident) => {
            if let Some(v) = kf.props.get($key).and_then(|v| v.as_f64()) {
                r.$field = v;
            }
        };
    }
    apply!("x", x);
    apply!("y", y);
    apply!("scaleX", scale_x);
    apply!("scaleY", scale_y);
    apply!("rotation", rotation);
    apply!("opacity", opacity);
}

fn lerp_props(r: &mut RenderTransform, prev: &RenderKeyframe, next: &RenderKeyframe, t: f64) {
    macro_rules! lerp_field {
        ($key:literal, $field:ident) => {
            let a = prev.props.get($key).and_then(|v| v.as_f64());
            let b = next.props.get($key).and_then(|v| v.as_f64());
            if let (Some(a), Some(b)) = (a, b) {
                r.$field = lerp(a, b, t);
            }
        };
    }
    lerp_field!("x", x);
    lerp_field!("y", y);
    lerp_field!("scaleX", scale_x);
    lerp_field!("scaleY", scale_y);
    lerp_field!("rotation", rotation);
    lerp_field!("opacity", opacity);
}

// ─── Shape rendering ────────────────────────────────────────────

fn draw_shape(
    img: &mut RgbaImage,
    content: &RenderContent,
    t: &RenderTransform,
    _comp_w: u32, _comp_h: u32,
    sf: f64,
) {
    let w = (content.width.unwrap_or(100.0) * sf) as i32;
    let h = (content.height.unwrap_or(100.0) * sf) as i32;
    let cx = (t.x * sf) as i32;
    let cy = (t.y * sf) as i32;
    let half_w = w / 2;
    let half_h = h / 2;
    let fill = hex_to_rgba(content.fill.as_deref().unwrap_or("#ffffff"));
    let stroke = content.stroke.as_ref().map(|s| hex_to_rgba(s));
    let _sw = (content.stroke_width.unwrap_or(2.0) * sf) as i32;

    let rect = imageproc::rect::Rect::at(cx - half_w, cy - half_h).of_size(w.max(0) as u32, h.max(0) as u32);

    match content.shape.as_deref() {
        Some("ellipse") => {
            let _ = drawing::draw_filled_ellipse(img, (cx, cy), half_w.max(1), half_h.max(1), fill);
            if let Some(sc) = stroke {
                let _ = drawing::draw_hollow_ellipse(img, (cx, cy), half_w.max(1), half_h.max(1), sc);
            }
        }
        Some("triangle") => {
            let pts = [
                Point::new(cx, cy - half_h),
                Point::new(cx - half_w, cy + half_h),
                Point::new(cx + half_w, cy + half_h),
            ];
            drawing::draw_polygon(img, &pts, fill);
            if let Some(sc) = stroke {
                drawing::draw_polygon(img, &pts, sc);
            }
        }
        Some("star") => {
            let outer = half_w.min(half_h) as f64;
            let inner = outer * 0.5;
            let mut pts = Vec::new();
            for i in 0..10 {
                let r = if i % 2 == 0 { outer } else { inner };
                let a = -std::f64::consts::FRAC_PI_2 + (i as f64) * std::f64::consts::PI / 5.0;
                pts.push(Point::new(
                    cx + (r * a.cos()) as i32,
                    cy + (r * a.sin()) as i32,
                ));
            }
            drawing::draw_polygon(img, &pts, fill);
            if let Some(sc) = stroke {
                drawing::draw_polygon(img, &pts, sc);
            }
        }
        _ => {
            // rectangle (default)
            let _ = drawing::draw_filled_rect(img, rect, fill);
            if let Some(sc) = stroke {
                let _ = drawing::draw_hollow_rect(img, rect, sc);
            }
        }
    }
}

// ─── Frame rendering ────────────────────────────────────────────

pub fn render_frame(comp: &RenderComposition, frame: u32) -> RgbaImage {
    let w = comp.width;
    let h = comp.height;
    let mut img = RgbaImage::new(w, h);
    let bg = hex_to_rgba(&comp.background);
    for p in img.pixels_mut() {
        *p = bg;
    }
    for layer in &comp.layers {
        if !layer.enabled {
            continue;
        }
        let t = interpolate_transform(&layer.transform, &layer.keyframes, frame);
        if t.opacity <= 0.0 {
            continue;
        }
        // Apply opacity: multiply alpha by opacity
        if layer.content.kind == "shape" {
            draw_shape(&mut img, &layer.content, &t, w, h, 1.0);
        }
        // text is rendered by the frontend Canvas, not here
    }
    img
}

// ─── Tauri Commands ─────────────────────────────────────────────

/// Render a shape-only composition headlessly (no text) and encode to MP4.
#[tauri::command]
pub fn render_composition(
    app: AppHandle,
    composition: RenderComposition,
    output_path: Option<String>,
) -> Result<RenderResult, String> {
    let total = composition.total_frames;
    let fps = composition.fps;
    let tmp = tempfile::tempdir().map_err(|e| e.to_string())?;
    let frame_dir = tmp.path().join("frames");
    fs::create_dir_all(&frame_dir).map_err(|e| e.to_string())?;

    let out_path = output_path.map(PathBuf::from).unwrap_or_else(|| {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".into());
        PathBuf::from(home).join("Desktop").join("AI-Studio-OS-Export.mp4")
    });
    if let Some(p) = out_path.parent() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }

    // Render frames
    for f in 0..total {
        let img = render_frame(&composition, f);
        let p = frame_dir.join(format!("frame_{:06}.png", f));
        img.save(&p).map_err(|e| e.to_string())?;
        let _ = app.emit("render-progress", RenderProgress {
            frame: f + 1, total,
            phase: "rendering".into(),
            message: format!("Frame {}/{}", f + 1, total),
        });
    }

    // Encode
    let _ = app.emit("render-progress", RenderProgress {
        frame: total, total,
        phase: "encoding".into(),
        message: "Encoding...".into(),
    });

    encode_frames_internal(&frame_dir, &out_path, fps, &composition)?;

    let _ = app.emit("render-progress", RenderProgress {
        frame: total, total,
        phase: "done".into(),
        message: format!("Exported: {}", out_path.display()),
    });

    // Cleanup
    let _ = fs::remove_dir_all(&frame_dir);
    let _ = tmp.close();

    Ok(RenderResult {
        path: out_path.to_string_lossy().to_string(),
        frames: total,
        width: composition.width,
        height: composition.height,
        duration_secs: total as f64 / fps,
    })
}

/// Encode a directory of PNG frames (produced by the frontend Canvas) to MP4.
#[tauri::command]
pub fn encode_frames(
    app: AppHandle,
    frame_dir: String,
    output_path: String,
    fps: f64,
    width: u32,
    height: u32,
    total_frames: u32,
) -> Result<RenderResult, String> {
    let dir = PathBuf::from(&frame_dir);
    let out = PathBuf::from(&output_path);
    if let Some(p) = out.parent() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }

    let _ = app.emit("render-progress", RenderProgress {
        frame: total_frames, total: total_frames,
        phase: "encoding".into(),
        message: "Encoding frames to MP4...".into(),
    });

    let comp = RenderComposition {
        width, height, fps, total_frames,
        background: "#000000".into(),
        layers: vec![],
    };
    encode_frames_internal(&dir, &out, fps, &comp)?;

    let _ = app.emit("render-progress", RenderProgress {
        frame: total_frames, total: total_frames,
        phase: "done".into(),
        message: format!("Exported: {}", out.display()),
    });

    Ok(RenderResult {
        path: out.to_string_lossy().to_string(),
        frames: total_frames,
        width, height,
        duration_secs: total_frames as f64 / fps,
    })
}

fn encode_frames_internal(
    frame_dir: &PathBuf,
    out_path: &PathBuf,
    fps: f64,
    _comp: &RenderComposition,
) -> Result<(), String> {
    let ffmpeg = find_ffmpeg();
    let pattern = frame_dir.join("frame_%06d.png");

    let status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-framerate", &fps.to_string(),
            "-i", &pattern.to_string_lossy(),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "medium",
            "-crf", "18",
            &out_path.to_string_lossy(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .map_err(|e| format!("FFmpeg not found or failed: {}", e))?;

    if !status.success() {
        return Err("FFmpeg encoding failed".into());
    }
    Ok(())
}

/// Export a directory of PNG frames to animated GIF via FFmpeg.
#[tauri::command]
pub fn export_gif(
    app: AppHandle,
    frame_dir: String,
    output_path: String,
    fps: f64,
    width: u32,
    height: u32,
    total_frames: u32,
) -> Result<RenderResult, String> {
    let dir = PathBuf::from(&frame_dir);
    let out = PathBuf::from(&output_path);
    if let Some(p) = out.parent() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }

    let _ = app.emit("render-progress", RenderProgress {
        frame: total_frames, total: total_frames,
        phase: "encoding".into(),
        message: "Encoding frames to GIF...".into(),
    });

    let ffmpeg = find_ffmpeg();
    let pattern = dir.join("frame_%06d.png");
    let palette_path = dir.join("palette.png");

    // Generate palette
    let pal_status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-framerate", &fps.to_string(),
            "-i", &pattern.to_string_lossy(),
            "-vf", &format!("fps={},scale={}:{}:flags=lanczos,palettegen", fps as u32, width, height),
            &palette_path.to_string_lossy(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .map_err(|e| format!("FFmpeg palette generation failed: {}", e))?;

    if !pal_status.success() {
        return Err("FFmpeg palette generation failed".into());
    }

    // Encode GIF using palette
    let gif_status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-framerate", &fps.to_string(),
            "-i", &pattern.to_string_lossy(),
            "-i", &palette_path.to_string_lossy(),
            "-lavfi", &format!("fps={},scale={}:{}:flags=lanczos [x]; [x][1:v] paletteuse", fps as u32, width, height),
            &out.to_string_lossy(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .map_err(|e| format!("FFmpeg GIF encoding failed: {}", e))?;

    if !gif_status.success() {
        return Err("FFmpeg GIF encoding failed".into());
    }

    let _ = fs::remove_file(&palette_path);

    let _ = app.emit("render-progress", RenderProgress {
        frame: total_frames, total: total_frames,
        phase: "done".into(),
        message: format!("Exported: {}", out.display()),
    });

    Ok(RenderResult {
        path: out.to_string_lossy().to_string(),
        frames: total_frames,
        width, height,
        duration_secs: total_frames as f64 / fps,
    })
}

fn find_ffmpeg() -> String {
    let candidates = [
        "ffmpeg",
        "ffmpeg.exe",
        r"C:\Users\trev2\AppData\Local\Microsoft\WinGet\Links\ffmpeg",
    ];
    for c in &candidates {
        if Command::new(c).arg("-version").stdout(Stdio::null()).stderr(Stdio::null()).status().is_ok() {
            return c.to_string();
        }
    }
    "ffmpeg".to_string()
}