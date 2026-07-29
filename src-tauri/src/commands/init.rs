use crate::commands::paths;
use std::fs;
use tauri::AppHandle;

/// Create the entire directory tree on first run.
/// Safe to call every startup — `fs::create_dir_all` is a no-op if the dir exists.
pub fn ensure_dirs(app: &AppHandle) -> Result<(), String> {
    let root = paths::data_root(app);

    // Root sentinel files
    touch(root.join(".schema-version"), "1")?;

    // --- Projects ---
    create_dir(app, "projects")?;

    // --- Templates ---
    create_dir(app, "templates/projects")?;
    create_dir(app, "templates/animations")?;
    create_dir(app, "templates/themes")?;
    create_dir(app, "templates/layouts")?;
    create_dir(app, "templates/icons")?;

    // --- Assets: Images ---
    create_dir(app, "assets/images/imported")?;
    create_dir(app, "assets/images/textures")?;
    create_dir(app, "assets/images/references")?;

    // --- Assets: Videos ---
    create_dir(app, "assets/videos/imported")?;
    create_dir(app, "assets/videos/stock/abstract")?;
    create_dir(app, "assets/videos/stock/nature")?;
    create_dir(app, "assets/videos/stock/urban")?;
    create_dir(app, "assets/videos/proxies/480p")?;
    create_dir(app, "assets/videos/proxies/720p")?;

    // --- Assets: Audio ---
    create_dir(app, "assets/audio/music/imported")?;
    create_dir(app, "assets/audio/music/stock/cinematic")?;
    create_dir(app, "assets/audio/music/stock/upbeat")?;
    create_dir(app, "assets/audio/music/stock/ambient")?;
    create_dir(app, "assets/audio/music/generated")?;
    create_dir(app, "assets/audio/voices/recordings")?;
    create_dir(app, "assets/audio/voices/ai-generated")?;
    create_dir(app, "assets/audio/voices/cloned")?;
    create_dir(app, "assets/audio/sfx/imported")?;
    create_dir(app, "assets/audio/sfx/stock/whoosh")?;
    create_dir(app, "assets/audio/sfx/stock/click")?;
    create_dir(app, "assets/audio/sfx/stock/impact")?;
    create_dir(app, "assets/audio/sfx/stock/transition")?;
    create_dir(app, "assets/audio/sfx/generated")?;

    // --- Assets: Fonts ---
    create_dir(app, "assets/fonts/system")?;
    create_dir(app, "assets/fonts/google")?;
    create_dir(app, "assets/fonts/custom")?;

    // --- Assets: Models ---
    create_dir(app, "assets/models/llm")?;
    create_dir(app, "assets/models/diffusion")?;
    create_dir(app, "assets/models/voice")?;
    create_dir(app, "assets/models/vision")?;
    create_dir(app, "assets/models/embedding")?;

    // --- Assets: 3D ---
    create_dir(app, "assets/3d/imported")?;
    create_dir(app, "assets/3d/stock")?;
    create_dir(app, "assets/3d/hdri")?;

    // --- Assets: Icons ---
    create_dir(app, "assets/icons/built-in/16x16")?;
    create_dir(app, "assets/icons/built-in/24x24")?;
    create_dir(app, "assets/icons/built-in/32x32")?;
    create_dir(app, "assets/icons/built-in/svg")?;
    create_dir(app, "assets/icons/plugin")?;
    create_dir(app, "assets/icons/packs")?;

    // --- Exports ---
    create_dir(app, "exports/videos")?;
    create_dir(app, "exports/images")?;
    create_dir(app, "exports/audio")?;
    create_dir(app, "exports/packages")?;
    create_dir(app, "exports/batch")?;

    // --- Plugins ---
    create_dir(app, "plugins/built-in")?;
    create_dir(app, "plugins/user")?;
    create_dir(app, "plugins/disabled")?;

    // --- Themes ---
    create_dir(app, "themes/built-in")?;
    create_dir(app, "themes/user")?;

    // --- App Icons ---
    create_dir(app, "icons")?;

    // --- Settings ---
    create_dir(app, "settings")?;

    // --- Logs ---
    create_dir(app, "logs/crash")?;
    create_dir(app, "logs/diagnostics")?;

    // --- Cache ---
    create_dir(app, "cache/thumbnails/projects")?;
    create_dir(app, "cache/thumbnails/assets/images")?;
    create_dir(app, "cache/thumbnails/assets/videos")?;
    create_dir(app, "cache/thumbnails/assets/models")?;
    create_dir(app, "cache/thumbnails/fonts")?;
    create_dir(app, "cache/render/disk-cache")?;
    create_dir(app, "cache/render/ram-cache")?;
    create_dir(app, "cache/fonts/atlas")?;
    create_dir(app, "cache/fonts/sdf")?;
    create_dir(app, "cache/models/llm")?;
    create_dir(app, "cache/models/diffusion")?;
    create_dir(app, "cache/icons/16x16")?;
    create_dir(app, "cache/icons/24x24")?;
    create_dir(app, "cache/icons/32x32")?;
    create_dir(app, "cache/temp/downloads")?;
    create_dir(app, "cache/temp/uploads")?;
    create_dir(app, "cache/temp/processing")?;

    // --- Backups ---
    create_dir(app, "backups/full")?;
    create_dir(app, "backups/incremental")?;

    // --- Versioning ---
    create_dir(app, "versioning")?;

    // --- Autosaves ---
    create_dir(app, "autosaves/quicksaves")?;

    // --- User ---
    create_dir(app, "user/profiles/default")?;
    create_dir(app, "user/keys")?;
    create_dir(app, "user/data/prompts/image-generation")?;
    create_dir(app, "user/data/prompts/video-generation")?;
    create_dir(app, "user/data/prompts/music-generation")?;
    create_dir(app, "user/data/presets/effects")?;
    create_dir(app, "user/data/presets/transitions")?;
    create_dir(app, "user/data/presets/color-grades")?;
    create_dir(app, "user/data/scripts")?;
    create_dir(app, "user/data/notes")?;

    // --- Agents ---
    create_dir(app, "agents/built-in/assistant")?;
    create_dir(app, "agents/built-in/copywriter")?;
    create_dir(app, "agents/built-in/storyboarder")?;
    create_dir(app, "agents/user")?;
    create_dir(app, "agents/marketplace")?;

    // --- Analytics ---
    create_dir(app, "analytics")?;

    // --- Trash ---
    create_dir(app, ".trash")?;

    Ok(())
}

fn create_dir(app: &AppHandle, subpath: &str) -> Result<(), String> {
    let p = paths::resolve(app, subpath);
    fs::create_dir_all(&p).map_err(|e| format!("Failed to create {}: {}", p.display(), e))
}

fn touch(path: PathBuf, content: &str) -> Result<(), String> {
    if !path.exists() {
        fs::write(&path, content)
            .map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
    }
    Ok(())
}