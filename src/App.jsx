import { useState, useEffect } from "react";

const GMAIL_MCP = "https://gmail.mcp.claude.com/mcp";

const BILL_SYSTEM = `You are an AI communications assistant for Bill Garrity, founder of Clubhouse CTV / ClubOS. You have two modes:

MODE 1 — FETCH & TRIAGE: When asked to fetch emails, use the Gmail MCP to search for recent unread messages. Return a JSON array of the most relevant emails (max 8), prioritizing business contacts. Format:
[{"id":"...","from":"...","subject":"...","preview":"first 120 chars of body","date":"...","category":"customer|prospect|partner|vendor|internal|other","urgency":"high|normal|low"}]
Return ONLY the JSON array, no other text.

MODE 2 — DRAFT: When given an email and asked to draft a response, write it in Bill's voice:
- Direct, warm, never salesy. Gets to the point in sentence one.
- Short paragraphs, 3-4 sentences max each.
- Outcome-focused, not feature-focused.
- Confident without being pushy. Never over-apologizes.
- Signs off as just "Bill" — never "Best regards" or "Sincerely"
- Casual with warm contacts, value-first with prospects, solution-first with issues.

COMPANY CONTEXT:
- Clubhouse CTV / ClubOS: AI-powered digital signage + member experience for private clubs
- Positioning: "Infrastructure, not a vendor"
- Two-screen model: TV as shared stage, phone via QR as controller (no app download)
- Key contacts: Ana (Invited Clubs, close/operational), April Cochran (Invited, exec decision-maker), Matt at Ballantyne CC (GM, champion), Paul at Medina (loyal customer MN), Morgan Noble at Spectrio (CSM)

For MODE 2: Return ONLY the draft message text, ready to copy and send. No preamble.`;

const CATEGORIES = {
  customer: { color: "#52A86D", label: "Customer" },
  prospect: { color: "#C9A84C", label: "Prospect" },
  partner: { color: "#7B8CDE", label: "Partner" },
  vendor: { color: "#8B7355", label: "Vendor" },
  internal: { color: "#5BA3B0", label: "Internal" },
  other: { color: "rgba(245,240,232,0.3)", label: "Other" },
};

const URGENCY = {
  high: { color: "#E05252", dot: "🔴" },
  normal: { color: "#C9A84C", dot: "🟡" },
  low: { color: "rgba(245,240,232,0.2)", dot: "⚪" },
};

export default function ClubOSComms() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [tone, setTone] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [view, setView] = useState("inbox"); // inbox | compose

  async function fetchInbox() {
    setLoading(true);
    setFetchError("");
    setEmails([]);
    setSelected(null);
    setDraft("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: BILL_SYSTEM,
          messages: [{
            role: "user",
            content: "MODE 1: Fetch my recent unread Gmail messages that need responses. Use gmail_search_messages with query 'is:unread' and limit 10. Return the JSON array."
          }],
          mcp_servers: [{ type: "url", url: GMAIL_MCP, name: "gmail" }]
        })
      });
      const data = await res.json();
      const textBlock = data.content?.find(b => b.type === "text")?.text || "[]";
      const clean = textBlock.replace(/```json|```/g, "").trim();
      // find first [ to last ]
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start === -1) throw new Error("No email data returned");
      const parsed = JSON.parse(clean.slice(start, end + 1));
      setEmails(parsed);
      if (parsed.length > 0) setSelected(parsed[0]);
    } catch (e) {
      setFetchError("Couldn't load inbox. Make sure Gmail is connected in your Claude settings.");
    }
    setLoading(false);
  }

  async function generateDraft() {
    if (!selected) return;
    setDraftLoading(true);
    setDraft("");
    const toneNote = tone ? `Tone: ${tone}. ` : "";
    const extraNote = note ? `Additional context: ${note}. ` : "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: BILL_SYSTEM,
          messages: [{
            role: "user",
            content: `MODE 2: Draft a response to this email.\n\nFrom: ${selected.from}\nSubject: ${selected.subject}\nMessage: ${selected.preview}\n\n${toneNote}${extraNote}Write the response in Bill's voice.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      setDraft(text);
    } catch (e) {
      setDraft("Error generating draft. Try again.");
    }
    setDraftLoading(false);
  }

  function copyDraft() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cat = selected ? (CATEGORIES[selected.category] || CATEGORIES.other) : null;

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: "#0B1912",
      minHeight: "100vh",
      color: "#F0EBE0",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* TOP BAR */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
        background: "#091510",
        borderBottom: "1px solid rgba(201,168,76,0.15)",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9A84C", boxShadow: "0 0 8px rgba(201,168,76,0.7)" }} />
          <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "#C9A84C", fontWeight: 500 }}>
            ClubOS Comms
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(240,235,224,0.3)", letterSpacing: "0.5px" }}>Bill Garrity</span>
          <button onClick={fetchInbox} disabled={loading} style={{
            padding: "7px 16px",
            background: loading ? "rgba(201,168,76,0.2)" : "#C9A84C",
            color: loading ? "rgba(201,168,76,0.5)" : "#091510",
            border: "none", borderRadius: 6,
            fontSize: 12, fontWeight: 700, letterSpacing: "1px",
            textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit"
          }}>
            {loading ? "Loading…" : emails.length > 0 ? "↻ Refresh" : "Load Inbox"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: emails.length > 0 ? "280px 1fr" : "1fr", minHeight: 0 }}>

        {/* EMAIL LIST */}
        {emails.length > 0 && (
          <div style={{
            borderRight: "1px solid rgba(201,168,76,0.12)",
            overflowY: "auto",
            background: "#0B1912"
          }}>
            <div style={{ padding: "14px 16px 8px", fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(201,168,76,0.5)" }}>
              Inbox · {emails.length} messages
            </div>
            {emails.map((email, i) => {
              const isSelected = selected?.id === email.id;
              const c = CATEGORIES[email.category] || CATEGORIES.other;
              const u = URGENCY[email.urgency] || URGENCY.normal;
              return (
                <div key={email.id || i} onClick={() => { setSelected(email); setDraft(""); setNote(""); setTone(""); }}
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid rgba(240,235,224,0.04)",
                    cursor: "pointer",
                    background: isSelected ? "rgba(201,168,76,0.08)" : "transparent",
                    borderLeft: isSelected ? `3px solid ${c.color}` : "3px solid transparent",
                    transition: "all 0.15s"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#F0EBE0" : "rgba(240,235,224,0.75)", letterSpacing: "0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "75%" }}>
                      {email.from?.split("<")[0].trim() || email.from}
                    </div>
                    <div style={{ fontSize: 9, color: u.color, flexShrink: 0 }}>●</div>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(240,235,224,0.5)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {email.subject}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11, color: "rgba(240,235,224,0.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                      {email.preview?.slice(0, 55)}{email.preview?.length > 55 ? "…" : ""}
                    </div>
                    <div style={{
                      marginLeft: 8, fontSize: 9, fontWeight: 600, letterSpacing: "1px",
                      textTransform: "uppercase", color: c.color, flexShrink: 0,
                      padding: "2px 6px", borderRadius: 3,
                      background: c.color + "18",
                      border: `1px solid ${c.color}30`
                    }}>
                      {c.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", padding: "28px" }}>

          {/* EMPTY STATE */}
          {!loading && emails.length === 0 && !fetchError && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "rgba(240,235,224,0.15)" }}>
              <div style={{ fontSize: 52, opacity: 0.25 }}>✉</div>
              <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontStyle: "italic", color: "rgba(201,168,76,0.3)" }}>
                Your inbox, drafted.
              </div>
              <div style={{ fontSize: 13, textAlign: "center", maxWidth: 320, lineHeight: 1.6, color: "rgba(240,235,224,0.2)" }}>
                Hit Load Inbox to pull your recent unread messages and start drafting responses in your voice.
              </div>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.15)", borderTopColor: "#52A86D", animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: "rgba(240,235,224,0.3)", letterSpacing: "1px" }}>Reading your inbox…</div>
            </div>
          )}

          {/* ERROR */}
          {fetchError && (
            <div style={{ padding: "20px", background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.3)", borderRadius: 10, color: "#E05252", fontSize: 14 }}>
              {fetchError}
            </div>
          )}

          {/* EMAIL + DRAFT VIEW */}
          {!loading && selected && (
            <>
              {/* Email header */}
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: 10 }}>
                  Inbound
                </div>
                <div style={{ fontSize: 20, fontFamily: "Georgia, serif", color: "#F0EBE0", marginBottom: 8, lineHeight: 1.3 }}>
                  {selected.subject}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "rgba(240,235,224,0.5)" }}>
                    {selected.from}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(240,235,224,0.25)" }}>{selected.date}</span>
                  {cat && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: cat.color, padding: "2px 8px", borderRadius: 3, background: cat.color + "18", border: `1px solid ${cat.color}30` }}>
                      {cat.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: "rgba(240,235,224,0.45)", lineHeight: 1.65, background: "rgba(0,0,0,0.2)", padding: "14px 16px", borderRadius: 8, borderLeft: "3px solid rgba(201,168,76,0.2)" }}>
                  {selected.preview}
                </div>
              </div>

              {/* Draft controls */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: 10 }}>
                  Draft Options
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {["Brief", "Professional", "Warm", "Urgent", "Appreciative"].map(t => (
                    <button key={t} onClick={() => setTone(tone === t ? "" : t)}
                      style={{
                        padding: "5px 13px", borderRadius: 20,
                        border: `1px solid ${tone === t ? "#C9A84C" : "rgba(201,168,76,0.2)"}`,
                        background: tone === t ? "rgba(201,168,76,0.12)" : "transparent",
                        color: tone === t ? "#C9A84C" : "rgba(240,235,224,0.35)",
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit"
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Any context? e.g. 'Don't mention pricing yet' or 'She's been waiting 3 days'"
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8,
                    padding: "10px 14px", fontSize: 13, color: "#F0EBE0",
                    fontFamily: "inherit", outline: "none"
                  }} />
              </div>

              <button onClick={generateDraft} disabled={draftLoading}
                style={{
                  padding: "14px", marginBottom: 20,
                  background: draftLoading ? "rgba(201,168,76,0.3)" : "#C9A84C",
                  color: "#091510", border: "none", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, letterSpacing: "1.5px",
                  textTransform: "uppercase", cursor: draftLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit"
                }}>
                {draftLoading ? "Writing…" : draft ? "↻ Redraft" : "Draft Response"}
              </button>

              {/* Draft loading */}
              {draftLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(240,235,224,0.3)", fontSize: 13 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.15)", borderTopColor: "#52A86D", animation: "spin 1s linear infinite" }} />
                  Writing in your voice…
                </div>
              )}

              {/* Draft output */}
              {!draftLoading && draft && (
                <>
                  <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10 }}>
                    Your Draft
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    borderRadius: 12, padding: "18px 20px",
                    fontSize: 15, lineHeight: 1.75,
                    color: "#F0EBE0", whiteSpace: "pre-wrap",
                    marginBottom: 14
                  }}>
                    {draft}
                  </div>
                  <div style={{ display: "flex", gap: 9 }}>
                    <button onClick={copyDraft}
                      style={{
                        flex: 1, padding: "13px",
                        background: copied ? "#3D7A52" : "#C9A84C",
                        color: "#091510", border: "none", borderRadius: 8,
                        fontSize: 13, fontWeight: 700, letterSpacing: "1px",
                        textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit"
                      }}>
                      {copied ? "✓ Copied — Paste into Gmail" : "Copy Draft"}
                    </button>
                    <button onClick={() => setDraft("")}
                      style={{
                        padding: "13px 18px", background: "transparent",
                        border: "1px solid rgba(240,235,224,0.1)", borderRadius: 8,
                        color: "rgba(240,235,224,0.25)", fontSize: 12,
                        cursor: "pointer", fontFamily: "inherit"
                      }}>
                      Clear
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
