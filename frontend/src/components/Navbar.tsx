import { Languages, Menu } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { formatChildName } from "../lib/presentation";
import { useLocalAuth } from "../hooks/useLocalAuth";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useLocalAuth();
  const initials = user ? formatChildName(user.name).charAt(0) : null;

  return (
    <header className="sticky top-0 z-40 mb-8 border-b border-[#E5E7EB] bg-white/95 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4]">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M14 22C14 16 14.5 12.5 18.5 8.5" stroke="#1A7A4A" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M13.8 17.5C10.5 16.8 8.2 14.8 7 11.4C10.5 10.8 13.2 11.8 14.8 14.5" fill="#A7E3BD" stroke="#1A7A4A" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M15 13.8C16.4 10.6 19.2 8.8 23 8.6C22.6 12.2 20.8 14.8 17.2 15.9" fill="#D6F2C3" stroke="#1A7A4A" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[#1C2B2B]">NutriForge</p>
            <p className="text-xs text-[#6B7280]">बच्चे की सेहत, हमारी ज़िम्मेदारी</p>
            <p className="text-xs text-[#6B7280]">{t("childHealthResponsibility")}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavItem to="/" label={t("home")} />
          {user ? (
            <>
              <NavItem to="/dashboard" label={t("dashboard")} />
              <NavItem to="/history" label={t("history")} />
              <NavItem to="/field" label="Field Mode" />
            </>
          ) : null}
          <NavItem to="/about" label="About" />
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(i18n.language === "en" ? "hi" : "en")}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563]"
          >
            <Languages className="h-4 w-4" />
            {i18n.language === "en" ? "हिं" : "EN"}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A7A4A] text-sm font-bold text-white">{initials}</div>
              <button type="button" onClick={() => void logout()} className="hidden rounded-2xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#4B5563] md:inline-flex">
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <Link to="/signin" className="hidden rounded-2xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1C2B2B] md:inline-flex">
                Sign In
              </Link>
              <Link to="/signup" className="hidden rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] md:inline-flex">
                Get Started
              </Link>
            </>
          )}
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#5d5c57] md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-2xl px-4 py-2 text-sm font-semibold transition ${
          isActive ? "bg-[#1A7A4A] text-white" : "text-[#4B5563] hover:bg-[#F9FAFB]"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
