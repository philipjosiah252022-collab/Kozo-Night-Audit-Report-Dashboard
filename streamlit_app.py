"""Kozo Night Audit Report Dashboard on Streamlit.

Viewers sign in with a personal access token: type it on the sign-in screen,
or open the one-tap link  https://<app>.streamlit.app/?token=<token>
Tokens are set in the app's Secrets (see .streamlit/secrets.example.toml).
Remove someone's line from Secrets to withdraw their access.
"""
import base64, hashlib, hmac, json, os
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent
SRC, SLIPS = ROOT / "src", ROOT / "public" / "slips"

st.set_page_config(page_title="Kozo Night Audit Report Dashboard", page_icon="📊", layout="wide",
                   initial_sidebar_state="collapsed")
st.markdown("""<style>
#MainMenu, header[data-testid="stHeader"], footer {visibility:hidden;height:0}
.block-container{padding-top:1rem;padding-bottom:0;max-width:1400px}
iframe{border-radius:14px}
</style>""", unsafe_allow_html=True)


# ---------- access tokens ----------
def load_tokens() -> dict:
    """Return {name: token}. Accepts a [access_tokens] table, or ACCESS_TOKENS = "Name:token,Name:token"."""
    out = {}
    try:
        table = st.secrets.get("access_tokens", {})
        out.update({str(k): str(v) for k, v in dict(table).items()})
        raw = st.secrets.get("ACCESS_TOKENS", "")
    except Exception:
        raw = ""
    raw = raw or os.environ.get("ACCESS_TOKENS", "")
    for entry in filter(None, (e.strip() for e in raw.split(","))):
        name, _, tok = entry.rpartition(":")
        if name.strip() and tok.strip():
            out[name.strip()] = tok.strip()
    return out


def who_for(token: str, tokens: dict):
    if not token:
        return None
    h = hashlib.sha256(token.strip().encode()).digest()
    for name, tok in tokens.items():
        if hmac.compare_digest(h, hashlib.sha256(tok.encode()).digest()):
            return name
    return None


tokens = load_tokens()
if not tokens:
    st.error("No access tokens are set. Add them under the app's Settings → Secrets.")
    st.stop()

# A signed-in name stays valid only while that person's token is still in Secrets.
if st.session_state.get("who") and st.session_state["who"] not in tokens:
    st.session_state.pop("who")

url_token = st.query_params.get("token")
if url_token and not st.session_state.get("who"):
    st.session_state["who"] = who_for(url_token, tokens)
    if not st.session_state["who"]:
        st.session_state["bad_link"] = True

if not st.session_state.get("who"):
    left, mid, right = st.columns([1, 1.2, 1])
    with mid:
        st.markdown("<div style='height:8vh'></div>", unsafe_allow_html=True)
        st.markdown("## Kozo Night Audit Report Dashboard")
        st.write("Enter the access token you were sent. If you were sent a link, opening it signs you in.")
        if st.session_state.pop("bad_link", False):
            st.error("This access link is not valid or has been withdrawn. Ask the night auditor for a new one.")
        with st.form("signin"):
            tok = st.text_input("Access token", type="password")
            if st.form_submit_button("View reports", use_container_width=True):
                who = who_for(tok, tokens)
                if who:
                    st.session_state["who"] = who
                    st.query_params["token"] = tok.strip()  # keeps them signed in on refresh
                    st.rerun()
                st.error("That access token is not right. Check it and try again.")
    st.stop()


# ---------- dashboard ----------
@st.cache_data(show_spinner=False)
def build_page(mtime_key: float) -> str:
    rd = lambda f: (SRC / f).read_text(encoding="utf-8")
    nights = json.loads(rd("nights.json"))
    # Embed slip photos so they show inside Streamlit's frame.
    for n in nights:
        for p in n.get("photos", []):
            f = ROOT / "public" / p["src"]
            if f.exists():
                p["src"] = "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
    body = rd("body.html").replace("{{LOGO}}", rd("logo.datauri.txt").strip()).replace(
        "{{DATA}}", json.dumps(nights, ensure_ascii=False).replace("</", "<\\/"))
    head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,650'
            '&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">'
            '<style>body{margin:0}img{max-width:100%}</style></head><body>')
    return head + "<style>" + rd("style.css") + rd("extra.css") + "</style>" + body + "</body></html>"


key = max(f.stat().st_mtime for f in list(SRC.glob("*")) + list(SLIPS.glob("*.jpg")))
top_l, top_r = st.columns([4, 1])
with top_l:
    st.caption(f"Signed in as **{st.session_state['who']}**")
with top_r:
    if st.button("Sign out", use_container_width=True):
        st.session_state.pop("who", None)
        st.query_params.clear()
        st.rerun()

components.html(build_page(key), height=900, scrolling=True)
