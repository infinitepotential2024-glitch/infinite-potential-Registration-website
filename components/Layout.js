import Link from "next/link";
import { EXAM } from "../lib/supabaseClient";

export default function Layout({ children }) {
  return (
    <>
      <header>
        <div className="wrap bar">
          <Link href="/" className="brand">
            <img src="/logo.png" alt="Infinite Potential logo" />
            <span><b>Infinite Potential</b><span>An Ideal Science Coaching Centre</span></span>
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/register">Register</Link>
            <Link href="/admit">Admit card</Link>
            <Link href="/admin/login">Admin</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <div className="wrap foot-grid">
          <div><h3 style={{ color: "#fff" }}>Infinite Potential</h3><p>An Ideal Science Coaching Centre</p></div>
          <div><h3 style={{ color: "#fff" }}>Test centre</h3><p>{EXAM.centre}</p></div>
          <div><h3 style={{ color: "#fff" }}>Exam</h3><p>{EXAM.name}<br />{EXAM.dateLong}</p></div>
          <div><h3 style={{ color: "#fff" }}>Contact</h3><p><a href={`tel:${EXAM.phone}`}>{EXAM.phone}</a></p></div>
        </div>
        <div className="wrap" style={{ marginTop: "1.2rem", opacity: .8, fontSize: ".8rem" }}>
          © 2026 Infinite Potential — An Ideal Science Coaching Centre. All rights reserved.
        </div>
      </footer>
    </>
  );
}
