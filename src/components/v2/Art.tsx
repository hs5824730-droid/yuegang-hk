/**
 * Original vector artwork for the Harbour Joy "Eucalyptus" design (drawn for this site; no third-party assets).
 * Lines draw once on load; everything is static under prefers-reduced-motion.
 */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg className={`v-art ${className}`} viewBox="0 0 560 520" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="v-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EADBB4" />
          <stop offset="1" stopColor="#F3ECDD" />
        </linearGradient>
        <clipPath id="v-arch">
          <path d="M60 520V230C60 120 150 40 280 40s220 80 220 190v290Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#v-arch)">
        <rect width="560" height="520" fill="url(#v-sky)" />
        <circle className="v-art-sun" cx="392" cy="168" r="54" fill="#C9A86A" />
        <path d="M0 404c90-40 180-52 280-30s190 16 280-12v158H0Z" fill="#C9DACB" />
        <path d="M0 446c120-26 230-30 330-10s170 10 230-8v92H0Z" fill="#9FBDA8" />
        {/* house */}
        <g className="v-art-house">
          <path d="M150 432V300l104-82 104 82v132Z" fill="#FBF6EF" />
          <path d="M136 312l118-94 118 94" fill="none" stroke="#15302A" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="226" y="350" width="56" height="82" rx="6" fill="#15302A" />
          <circle cx="270" cy="392" r="4" fill="#C9A86A" />
          <rect x="174" y="330" width="34" height="34" rx="4" fill="#DCE7DE" stroke="#15302A" strokeWidth="5" />
          <rect x="300" y="330" width="34" height="34" rx="4" fill="#DCE7DE" stroke="#15302A" strokeWidth="5" />
          <path d="M150 432h208" stroke="#15302A" strokeWidth="8" strokeLinecap="round" />
        </g>
        {/* eucalyptus branch */}
        <g className="v-art-branch" fill="none" stroke="#2F6B55" strokeWidth="6" strokeLinecap="round">
          <path className="v-draw" d="M520 70C452 130 430 200 446 300" />
          <path className="v-draw" d="M470 140c-30-6-54 4-70 26" />
          <path className="v-draw" d="M452 214c26-16 52-16 74 2" />
          <path className="v-draw" d="M444 262c-26-4-48 6-62 26" />
        </g>
        <g className="v-art-leaves" fill="#2F6B55">
          <ellipse cx="398" cy="170" rx="30" ry="12" transform="rotate(-28 398 170)" />
          <ellipse cx="530" cy="214" rx="30" ry="12" transform="rotate(14 530 214)" />
          <ellipse cx="380" cy="290" rx="28" ry="11" transform="rotate(-34 380 290)" />
          <ellipse cx="500" cy="96" rx="26" ry="10" transform="rotate(38 500 96)" />
        </g>
      </g>
      <path className="v-draw v-art-outline" d="M60 520V230C60 120 150 40 280 40s220 80 220 190v290" fill="none" stroke="#15302A" strokeWidth="3" />
      {/* key tag */}
      <g className="v-art-key" transform="translate(40 330) rotate(-12)">
        <rect width="132" height="62" rx="31" fill="#15302A" />
        <circle cx="31" cy="31" r="12" fill="none" stroke="#C9A86A" strokeWidth="6" />
        <path d="M43 31h62m-14 0v12m-14-12v8" stroke="#C9A86A" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Small decorative leaf used on dark panels. */
export function Leaf({ className = '' }: { className?: string }) {
  return (
    <svg className={`v-leaf ${className}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path d="M18 102C22 52 52 18 104 14c-2 52-34 86-86 88Z" fill="currentColor" opacity=".9" />
      <path d="M22 98C46 70 68 48 98 22" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
