"use client";

import { useState } from "react";
import styles from "./styles.module.css";

type Appearance = "light" | "dark";
type Variant = "faithful" | "refined" | "contrast";

const variants: Array<{ id: number; kind: Variant; name: string; note: string }> = [
  { id: 1, kind: "faithful", name: "原图精准复原", note: "完整保留蓝色立体日历、淡四格、太阳月亮与橙紫双箭的比例和层次。" },
  { id: 2, kind: "refined", name: "原图轻量精修", note: "构图不变，仅减弱日期格与阴影，让小尺寸图标更干净。" },
  { id: 3, kind: "contrast", name: "原图高识别版", note: "构图不变，略增强箭头与日夜符号的对比，适合主屏幕小尺寸。" },
];

function ShiftIcon({ appearance, variant }: { appearance: Appearance; variant: Variant }) {
  const dark = appearance === "dark";
  const refined = variant === "refined";
  const contrast = variant === "contrast";
  const uid = `${appearance}-${variant}`;
  const gridOpacity = refined ? 0.22 : dark ? 0.24 : 0.42;

  return (
    <svg viewBox="0 0 320 320" role="img" aria-label={`${appearance === "light" ? "浅色" : "深色"}循环排班日历图标`}>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="48" y1="24" x2="270" y2="304" gradientUnits="userSpaceOnUse"><stop stopColor={dark ? "#163868" : "#2CB6FF"} /><stop offset="0.52" stopColor={dark ? "#092657" : "#1688F5"} /><stop offset="1" stopColor={dark ? "#071A42" : "#1767E9"} /></linearGradient>
        <linearGradient id={`back-${uid}`} x1="82" y1="54" x2="230" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor={dark ? "#2B70C7" : "#68C9FF"} stopOpacity="0.92" /><stop offset="0.52" stopColor={dark ? "#185AB6" : "#278EF2"} stopOpacity="0.93" /><stop offset="1" stopColor={dark ? "#123B83" : "#1768D7"} /></linearGradient>
        <linearGradient id={`paper-${uid}`} x1="80" y1="91" x2="236" y2="271" gradientUnits="userSpaceOnUse"><stop stopColor={dark ? "#25334A" : "#FFFFFF"} /><stop offset="0.7" stopColor={dark ? "#18243A" : "#FCFCFF"} /><stop offset="1" stopColor={dark ? "#111B2E" : "#E9EFFA"} /></linearGradient>
        <linearGradient id={`orange-${uid}`} x1="89" y1="91" x2="267" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD21F" /><stop offset="0.58" stopColor="#FFAC08" /><stop offset="1" stopColor="#FF6A18" /></linearGradient>
        <linearGradient id={`purple-${uid}`} x1="55" y1="183" x2="242" y2="258" gradientUnits="userSpaceOnUse"><stop stopColor="#A13BEE" /><stop offset="0.54" stopColor="#6D3CF3" /><stop offset="1" stopColor="#4C37E8" /></linearGradient>
        <linearGradient id={`sun-${uid}`} x1="119" y1="149" x2="151" y2="199" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD31C" /><stop offset="1" stopColor="#FF9408" /></linearGradient>
        <linearGradient id={`moon-${uid}`} x1="168" y1="148" x2="209" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#8194FF" /><stop offset="0.55" stopColor="#624AF1" /><stop offset="1" stopColor="#4329E6" /></linearGradient>
        <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor={dark ? "#AFC6ED" : "#E9EEFA"} /></linearGradient>
        <filter id={`outer-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#00184B" floodOpacity={dark ? "0.5" : "0.3"} /></filter>
        <filter id={`paper-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#062C7D" floodOpacity={refined ? "0.16" : "0.26"} /></filter>
        <filter id={`arrow-shadow-${uid}`} x="-30%" y="-30%" width="170%" height="190%"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#241064" floodOpacity={refined ? "0.16" : "0.28"} /></filter>
        <filter id={`soft-${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
        <clipPath id={`paper-clip-${uid}`}><rect x="49" y="93" width="222" height="177" rx="29" /></clipPath>
      </defs>
      <rect x="4" y="4" width="312" height="312" rx="69" fill={dark ? "#F7F9FC" : "#FFFFFF"} />
      <rect x="12" y="12" width="296" height="296" rx="62" fill={`url(#bg-${uid})`} filter={`url(#outer-shadow-${uid})`} />
      <path d="M45 71C45 48 64 30 87 30H233C256 30 275 48 275 71V254H45V71Z" fill={`url(#back-${uid})`} />
      <path d="M57 71C57 52 72 41 91 41H229C247 41 260 53 263 69" fill="none" stroke="#C5ECFF" strokeOpacity={dark ? "0.17" : "0.34"} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="101" cy="73" rx="17" ry="18" fill="#063DA7" opacity={dark ? "0.75" : "0.9"} /><ellipse cx="219" cy="73" rx="17" ry="18" fill="#063DA7" opacity={dark ? "0.75" : "0.9"} />
      <ellipse cx="101" cy="77" rx="14" ry="10" fill="#032B85" opacity="0.48" filter={`url(#soft-${uid})`} /><ellipse cx="219" cy="77" rx="14" ry="10" fill="#032B85" opacity="0.48" filter={`url(#soft-${uid})`} />
      <rect x="49" y="93" width="222" height="177" rx="29" fill={`url(#paper-${uid})`} filter={`url(#paper-shadow-${uid})`} />
      <path d="M49 241V246C49 260 61 271 76 271H244C259 271 271 260 271 246V241C269 256 258 263 243 263H77C63 263 52 256 49 241Z" fill={dark ? "#0A1427" : "#CDD9EE"} opacity={dark ? "0.5" : "0.82"} />
      <g clipPath={`url(#paper-clip-${uid})`} opacity={gridOpacity}><rect x="68" y="113" width="37" height="37" rx="9" fill={dark ? "#46617E" : "#B8D8F6"} /><rect x="215" y="113" width="37" height="37" rx="9" fill={dark ? "#46617E" : "#B8D8F6"} /><rect x="68" y="216" width="37" height="37" rx="9" fill={dark ? "#46617E" : "#B8D8F6"} /><rect x="215" y="216" width="37" height="37" rx="9" fill={dark ? "#46617E" : "#B8D8F6"} /></g>
      <rect x="93" y="28" width="17" height="51" rx="8.5" fill={`url(#ring-${uid})`} /><rect x="210" y="28" width="17" height="51" rx="8.5" fill={`url(#ring-${uid})`} />
      <path d="M96 31C101 28 106 31 107 36" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2.5" strokeLinecap="round" /><path d="M213 31C218 28 223 31 224 36" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="160" cy="181" r="61" fill={dark ? "#111B2D" : "#FFFFFF"} opacity="0.94" /><path d="M160 123V238" stroke={dark ? "#30415D" : "#E6EBF6"} strokeWidth="2" />
      <g opacity={contrast ? 1 : 0.96}><circle cx="139" cy="176" r="17" fill={`url(#sun-${uid})`} />{[0,45,90,135,180,225,270,315].map((angle)=><rect key={angle} x="136" y="145" width="6" height="13" rx="3" fill="#FFAE0A" transform={`rotate(${angle} 139 176)`} />)}<circle cx="185" cy="177" r="24" fill={`url(#moon-${uid})`} /><circle cx="197" cy="166" r="21" fill={dark ? "#111B2D" : "#FFFFFF"} /><path d="M204 158L207 165L214 168L207 171L204 178L201 171L194 168L201 165Z" fill="#7D75F5" /><path d="M215 179L217 184L222 186L217 188L215 193L213 188L208 186L213 184Z" fill="#7D75F5" /><path d="M187 207L189 213L195 215L189 217L187 223L185 217L179 215L185 213Z" fill="#7D75F5" /></g>
      <g filter={`url(#arrow-shadow-${uid})`}>
        <path d="M82 178C88 124 124 91 169 91C207 91 229 110 243 136L255 128C260 125 265 129 264 135L259 172C258 178 253 181 248 178L216 159C211 156 211 150 216 147L228 140C216 122 195 111 169 111C135 111 109 136 104 176C103 182 98 185 93 183L85 181C82 181 80 180 82 178Z" fill={`url(#orange-${uid})`} stroke="#F58510" strokeOpacity="0.38" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M231 181C226 224 196 248 158 248C122 248 92 231 77 205L65 214C60 218 54 214 55 208L61 171C62 165 67 162 72 165L104 184C109 187 109 193 104 196L92 203C104 220 128 230 158 230C188 230 207 211 211 179C212 173 217 170 222 172L228 175C231 176 232 178 231 181Z" fill={`url(#purple-${uid})`} stroke="#5E30D9" strokeOpacity="0.42" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M95 171C103 133 132 102 169 102C199 102 222 116 236 139" fill="none" stroke="#FFF5B0" strokeOpacity={refined ? "0.16" : "0.34"} strokeWidth="2.5" strokeLinecap="round" /><path d="M85 205C100 228 127 240 158 240C191 240 217 219 222 183" fill="none" stroke="#D8A8FF" strokeOpacity={refined ? "0.16" : "0.32"} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function IconLabPage() {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const dark = appearance === "dark";
  return <main className={`${styles.page} ${dark ? styles.dark : ""}`}>
    <header className={styles.hero}><p className={styles.eyebrow}>SHIFT LEDGER · SOURCE REBUILD</p><h1>回到原图，认真复原</h1><p>不再扩散构图。第一款以原图为母版逐层 SVG 重画，另外两款只做克制的小尺寸优化。</p></header>
    <nav className={styles.switcher} aria-label="图标外观切换"><button className={!dark ? styles.active : ""} onClick={() => setAppearance("light")}>浅色外观</button><button className={dark ? styles.active : ""} onClick={() => setAppearance("dark")}>深色外观</button></nav>
    <section className={styles.featured}><div className={styles.featuredArt}><ShiftIcon appearance={appearance} variant="faithful" /></div><div className={styles.featuredCopy}><span>01 · 精准复原</span><h2>蓝色日历 × 昼夜循环</h2><p>箭头不是圆弧拼三角形，而是连续闭合的曲面轮廓。箭身、弯曲、收尖和箭头全部一体绘制。</p><div className={styles.details}><i>原图比例</i><i>双色双箭</i><i>日月分区</i><i>明暗双版</i></div><div className={styles.sizes}>{[80,60,40].map((size)=><div key={size} style={{width:size,height:size}}><ShiftIcon appearance={appearance} variant="faithful" /></div>)}</div></div></section>
    <section className={styles.variants}>{variants.slice(1).map((item)=><article key={item.id}><div className={styles.variantArt}><ShiftIcon appearance={appearance} variant={item.kind} /></div><div className={styles.variantCopy}><span>{String(item.id).padStart(2,"0")}</span><h2>{item.name}</h2><p>{item.note}</p></div></article>)}</section>
    <footer>本轮先只确认复原质量与明暗配色；敲定后再进入 Icon Composer 与 iOS 工作流。</footer>
  </main>;
}
