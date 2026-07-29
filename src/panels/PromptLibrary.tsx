import { useState, useEffect } from "react";

interface Prompt {
  id: string;
  name: string;
  text: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "aios-prompt-library";

function loadPrompts(): Prompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrompts(prompts: Prompt[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

const categories = ["Motion Graphics", "Script Writing", "Image Generation", "General"];

export function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  useEffect(() => {
    setPrompts(loadPrompts());
  }, []);

  const filtered = prompts.filter((p) => {
    if (filterCat && p.category !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditingId(null);
    setName("");
    setText("");
    setCategory(categories[0]);
    setShowEditor(true);
  };

  const openEdit = (p: Prompt) => {
    setEditingId(p.id);
    setName(p.name);
    setText(p.text);
    setCategory(p.category);
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!name.trim() || !text.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      const updated = prompts.map((p) =>
        p.id === editingId ? { ...p, name: name.trim(), text: text.trim(), category, updatedAt: now } : p,
      );
      setPrompts(updated);
      savePrompts(updated);
    } else {
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: name.trim(),
        text: text.trim(),
        category,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newPrompt, ...prompts];
      setPrompts(updated);
      savePrompts(updated);
    }
    setShowEditor(false);
  };

  const handleDelete = (id: string) => {
    const updated = prompts.filter((p) => p.id !== id);
    setPrompts(updated);
    savePrompts(updated);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const allCats = [...new Set([...categories, ...prompts.map((p) => p.category)])];

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="panel-title">Prompt Library</h1>
          <p className="panel-subtitle">Saved AI prompts for consistent generation ({prompts.length} prompts)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Prompt</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ width: 240 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts..."
        />
        <button className={`btn ${filterCat === null ? "btn-primary" : ""}`} onClick={() => setFilterCat(null)}>All</button>
        {allCats.map((cat) => (
          <button key={cat} className={`btn ${filterCat === cat ? "btn-primary" : ""}`} onClick={() => setFilterCat(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Edit Prompt" : "New Prompt"}</h2>
              <button className="btn" onClick={() => setShowEditor(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Prompt" />
              <label className="field-label" style={{ marginTop: 12 }}>Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="field-label" style={{ marginTop: 12 }}>Prompt Text</label>
              <textarea
                className="input"
                style={{ minHeight: 120, resize: "vertical", fontFamily: "monospace" }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your prompt here..."
              />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowEditor(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim() || !text.trim()}>
                {editingId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="placeholder-panel" style={{ height: "30vh" }}>
          <div className="placeholder-icon">💬</div>
          <div className="placeholder-text">
            {search || filterCat ? "No prompts match your search." : "No prompts yet. Create your first prompt to save time on AI generation."}
          </div>
          {!search && !filterCat && <button className="btn btn-primary" onClick={openNew}>+ New Prompt</button>}
        </div>
      ) : (
        <div className="panel-grid">
          {filtered.map((p) => (
            <div key={p.id} className="panel-card" style={{ cursor: "default", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div className="panel-card-title">{p.name}</div>
                <span className="badge badge-default" style={{ fontSize: 10 }}>{p.category}</span>
              </div>
              <div
                className="panel-card-desc"
                style={{ flex: 1, marginBottom: 12, whiteSpace: "pre-wrap", maxHeight: 100, overflow: "hidden", fontFamily: "monospace", fontSize: 11 }}
              >
                {p.text}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: "auto" }}>
                <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => handleCopy(p.text)}>📋 Copy</button>
                <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => openEdit(p)}>✏️ Edit</button>
                <button className="btn btn-outline-danger" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => handleDelete(p.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}