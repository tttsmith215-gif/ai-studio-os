// ─── AI Studio OS: Render Pipeline Test ─────────────────────────
// Standalone binary that proves the rendering pipeline works.
// Usage: cargo run --bin render-test [output.mp4]
// Requires: ffmpeg in PATH

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let output = args.get(1).cloned().unwrap_or_else(|| {
        let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into());
        format!("{}/Desktop/AI-Studio-OS-Test.mp4", home)
    });

    println!("── AI Studio OS Render Pipeline Test ──");
    println!("Output: {}", output);
    println!();

    // Define a test composition: 3-second animation at 30fps
    // Background: dark gray
    // Layer 1: Animated rectangle (scale up, fade in)
    // Layer 2: Animated triangle (rotate)
    let comp = ai_studio_os::render::RenderComposition {
        width: 1280,
        height: 720,
        fps: 30.0,
        total_frames: 90,
        background: "#1a1a2e".into(),
        layers: vec![
            // Layer 1: Purple rectangle that scales up and fades in
            ai_studio_os::render::RenderLayer {
                id: "layer-1".into(),
                name: "Background Rect".into(),
                layer_type: "shape".into(),
                enabled: true,
                transform: ai_studio_os::render::RenderTransform {
                    x: 640.0, y: 360.0,
                    scale_x: 1.0, scale_y: 1.0,
                    rotation: 0.0, opacity: 1.0,
                },
                keyframes: vec![
                    ai_studio_os::render::RenderKeyframe {
                        frame: 0,
                        props: serde_json::json!({"scaleX": 0.0, "scaleY": 0.0, "opacity": 0.0}),
                        easing: "ease-out".into(),
                        bezier: None,
                    },
                    ai_studio_os::render::RenderKeyframe {
                        frame: 30,
                        props: serde_json::json!({"scaleX": 1.0, "scaleY": 1.0, "opacity": 1.0}),
                        easing: "ease-out".into(),
                        bezier: None,
                    },
                ],
                content: ai_studio_os::render::RenderContent {
                    kind: "shape".into(),
                    shape: Some("rectangle".into()),
                    width: Some(400.0),
                    height: Some(300.0),
                    fill: Some("#6c5ce7".into()),
                    stroke: Some("#a29bfe".into()),
                    stroke_width: Some(4.0),
                    corner_radius: Some(20.0),
                    text: None, font_size: None, font_family: None,
                    color: None, align: None,
                },
            },
            // Layer 2: Teal ellipse that drops in
            ai_studio_os::render::RenderLayer {
                id: "layer-2".into(),
                name: "Bouncing Ellipse".into(),
                layer_type: "shape".into(),
                enabled: true,
                transform: ai_studio_os::render::RenderTransform {
                    x: 640.0, y: 360.0,
                    scale_x: 1.0, scale_y: 1.0,
                    rotation: 0.0, opacity: 1.0,
                },
                keyframes: vec![
                    ai_studio_os::render::RenderKeyframe {
                        frame: 15,
                        props: serde_json::json!({"y": -200.0, "opacity": 0.0}),
                        easing: "linear".into(),
                        bezier: None,
                    },
                    ai_studio_os::render::RenderKeyframe {
                        frame: 45,
                        props: serde_json::json!({"y": 360.0, "opacity": 1.0, "rotation": 360.0}),
                        easing: "ease-out".into(),
                        bezier: None,
                    },
                ],
                content: ai_studio_os::render::RenderContent {
                    kind: "shape".into(),
                    shape: Some("ellipse".into()),
                    width: Some(200.0),
                    height: Some(200.0),
                    fill: Some("#00cec9".into()),
                    stroke: Some("#81ecec".into()),
                    stroke_width: Some(3.0),
                    corner_radius: None,
                    text: None, font_size: None, font_family: None,
                    color: None, align: None,
                },
            },
            // Layer 3: Triangle that scales in
            ai_studio_os::render::RenderLayer {
                id: "layer-3".into(),
                name: "Triangle".into(),
                layer_type: "shape".into(),
                enabled: true,
                transform: ai_studio_os::render::RenderTransform {
                    x: 640.0, y: 360.0,
                    scale_x: 1.0, scale_y: 1.0,
                    rotation: 0.0, opacity: 1.0,
                },
                keyframes: vec![
                    ai_studio_os::render::RenderKeyframe {
                        frame: 45,
                        props: serde_json::json!({"scaleX": 0.0, "scaleY": 0.0, "opacity": 0.0, "rotation": -180.0}),
                        easing: "ease-out".into(),
                        bezier: None,
                    },
                    ai_studio_os::render::RenderKeyframe {
                        frame: 75,
                        props: serde_json::json!({"scaleX": 1.0, "scaleY": 1.0, "opacity": 1.0, "rotation": 0.0}),
                        easing: "ease-out".into(),
                        bezier: None,
                    },
                ],
                content: ai_studio_os::render::RenderContent {
                    kind: "shape".into(),
                    shape: Some("triangle".into()),
                    width: Some(180.0),
                    height: Some(180.0),
                    fill: Some("#fd79a8".into()),
                    stroke: Some("#fab1a0".into()),
                    stroke_width: Some(3.0),
                    corner_radius: None,
                    text: None, font_size: None, font_family: None,
                    color: None, align: None,
                },
            },
        ],
    };

    use std::process::Command;
    let ffmpeg = if Command::new("ffmpeg").arg("-version").output().is_ok() {
        "ffmpeg"
    } else {
        // Try explicit path
        r"C:\Users\trev2\AppData\Local\Microsoft\WinGet\Links\ffmpeg"
    };

    println!("Composition: {}x{} @ {}fps, {} frames",
        comp.width, comp.height, comp.fps, comp.total_frames);
    println!("Layers: {}", comp.layers.len());
    println!("FFmpeg: {}", ffmpeg);
    println!();

    // Render frames
    let tmp = tempfile::tempdir().expect("failed to create temp dir");
    let frame_dir = tmp.path().join("frames");
    std::fs::create_dir_all(&frame_dir).expect("failed to create frames dir");

    println!("Rendering {} frames...", comp.total_frames);
    for f in 0..comp.total_frames {
        let img = ai_studio_os::render::render_frame(&comp, f);
        let path = frame_dir.join(format!("frame_{:06}.png", f));
        img.save(&path).expect("failed to save frame");
        if f % 15 == 0 {
            println!("  Frame {}/{}", f + 1, comp.total_frames);
        }
    }
    println!("  Done!");

    // Encode to MP4
    println!();
    println!("Encoding to MP4...");
    let pattern = frame_dir.join("frame_%06d.png");
    let status = Command::new(ffmpeg)
        .args([
            "-y",
            "-framerate", &comp.fps.to_string(),
            "-i", &pattern.to_string_lossy(),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "medium",
            "-crf", "18",
            &output,
        ])
        .status()
        .expect("FFmpeg failed to start");

    if status.success() {
        println!("  ✓ Success! Output: {}", output);
        println!();
        // Print file size
        if let Ok(meta) = std::fs::metadata(&output) {
            let size_kb = meta.len() as f64 / 1024.0;
            println!("  File size: {:.1} KB", size_kb);
        }
    } else {
        eprintln!("  ✗ FFmpeg encoding failed");
        std::process::exit(1);
    }

    // Verify
    if let Ok(meta) = std::fs::metadata(&output) {
        if meta.len() > 0 {
            println!();
            println!("── Pipeline verified ──");
            println!("  ✓ JSON composition defined");
            println!("  ✓ Frames rendered ({} frames)", comp.total_frames);
            println!("  ✓ MP4 encoded ({} bytes)", meta.len());
            println!();
            println!("Ready to play: {}", output);
        }
    }
}