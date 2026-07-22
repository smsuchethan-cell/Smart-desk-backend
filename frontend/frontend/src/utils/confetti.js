const COLORS = ["#7C3AED", "#F59E0B", "#10B981", "#38BDF8", "#EF4444"];

// Small dependency-free confetti burst — used for Event mode check-ins.
export function fireConfetti(count = 60) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const duration = 2 + Math.random() * 1.5;
    const delay = Math.random() * 0.3;
    const size = 6 + Math.random() * 6;

    piece.style.position = "absolute";
    piece.style.top = "-20px";
    piece.style.left = `${left}vw`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.background = color;
    piece.style.opacity = "0.9";
    piece.style.borderRadius = "2px";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.animation = `confetti-fall ${duration}s ease-in ${delay}s forwards`;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 4000);
}
