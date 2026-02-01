export const CartIcon = ({ title = 'cart' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3h2l.4 2M7 13h10l3-8H6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="20" r="1.6" fill="currentColor" />
    <circle cx="18" cy="20" r="1.6" fill="currentColor" />
  </svg>
);

export const GearIcon = ({ title = 'loading' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.28-.47 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.3 3.7A2 2 0 0 1 7.12.88l.06.06A1.65 1.65 0 0 0 9 .87h.09a1.65 1.65 0 0 0 1 1.51c.22.53.8.93 1.51.93H12a2 2 0 0 1 4 0h.09c.7 0 1.28-.4 1.51-.93a1.65 1.65 0 0 0 1-1.51h.09a2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0-1 1.51c0 .52.31 1 .79 1.31z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BagIcon = ({ title = 'bag' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2h12v2H6z" fill="currentColor" />
    <path d="M3 6h18v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M16 11a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SuccessIcon = ({ title = 'success' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8.5 12.5l2 2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ErrorIcon = ({ title = 'error' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const InfoIcon = ({ title = 'info' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 8h.01M11 12h2v4h-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckIcon = ({ title = 'check' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WarningIcon = ({ title = 'warning' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LightIcon = ({ title = 'light' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18h6M10 22h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3a5 5 0 0 0-3 9v2a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3v-2a5 5 0 0 0-3-9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RefreshIcon = ({ title = 'refresh' }: { title?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 1-3.28-6.36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
