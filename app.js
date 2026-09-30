const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

// Цепочка предметов
const UPGRADE_CHAIN = [
  { icon: '🧸', name: 'Мишка' },
  { icon: '🌹', name: 'Роза', chance: 45 },
  { icon: '🚀', name: 'Ракета', chance: 33 },
  { icon: '💎', name: 'Алмаз', chance: 33 },
  { icon: '🎨', name: 'NFT', chance: 10 },
  { icon: '👑', name: 'Legendary NFT', chance: 5 }
];

let currentIndex = 0;
let isSpinning = false;
let serverSeed = "";
let clientSeed = "";

// Анимация искорок
const canvas = document.getElementById('fireCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
for (let i = 0; i < 40; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * 100,
    radius: Math.random() * 3 + 1,
    speedY: Math.random() * 2 + 1,
    opacity: Math.random()
  });
}

function renderParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 100)}, 0, ${p.opacity})`;
    ctx.fill();

    p.y -= p.speedY;
    if (p.y < 0) {
      p.y = canvas.height;
      p.x = Math.random() * canvas.width;
    }
  });
  requestAnimationFrame(renderParticles);
}
renderParticles();

// Provably Fair
function initProvablyFair() {
  serverSeed = CryptoJS.lib.WordArray.random(16).toString();
  clientSeed = tg?.initDataUnsafe?.user?.id?.toString() || "guest_user";
  const hash = CryptoJS.SHA256(serverSeed).toString();
  document.getElementById('serverHash').innerText = hash.substring(0, 16) + "...";
}
initProvablyFair();

// Обновление интерфейса
function updateUI() {
  const current = UPGRADE_CHAIN[currentIndex];
  const next = UPGRADE_CHAIN[currentIndex + 1];

  document.getElementById('currentIcon').innerText = current.icon;
  document.getElementById('currentName').innerText = current.name;

  if (next) {
    document.getElementById('nextIcon').innerText = next.icon;
    document.getElementById('nextName').innerText = next.name;
    document.getElementById('chancePercent').innerText = `${next.chance}%`;
    updateWheelGraphics(next.chance);
    document.getElementById('btnUpgrade').disabled = false;
  } else {
    document.getElementById('nextIcon').innerText = '👑';
    document.getElementById('nextName').innerText = 'МАКСИМУМ';
    document.getElementById('chancePercent').innerText = 'MAX';
    document.getElementById('btnUpgrade').disabled = true;
  }
}

function updateWheelGraphics(chance) {
  const wheel = document.getElementById('fireWheel');
  const winAngle = (chance / 100) * 360;
  wheel.style.background = `conic-gradient(
    #ff3300 0deg ${winAngle}deg,
    #2a0808 ${winAngle}deg 360deg
  )`;
}

// Кнопка Улучшить
document.getElementById('btnUpgrade').addEventListener('click', () => {
  if (isSpinning || currentIndex >= UPGRADE_CHAIN.length - 1) return;

  isSpinning = true;
  document.getElementById('statusMsg').innerText = "Вращение...";

  const target = UPGRADE_CHAIN[currentIndex + 1];
  const chance = target.chance;

  const hmac = CryptoJS.HmacSHA256(clientSeed, serverSeed).toString();
  const roll = parseInt(hmac.substring(0, 8), 16) % 100;

  const isWin = roll < chance;

  const wheel = document.getElementById('fireWheel');
  const baseRounds = 5 * 360;
  const winZoneCenter = (chance / 100 * 360) / 2;
  const targetAngle = isWin ? (360 - winZoneCenter) : (360 - (chance + 10)); 
  
  wheel.style.transform = `rotate(${baseRounds + targetAngle}deg)`;

  setTimeout(() => {
    if (isWin) {
      currentIndex++;
      document.getElementById('statusMsg').style.color = '#00ff66';
      document.getElementById('statusMsg').innerText = `УСПЕХ! Вы получили ${target.icon} ${target.name}`;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else {
      document.getElementById('statusMsg').style.color = '#ff3333';
      document.getElementById('statusMsg').innerText = "НЕУДАЧА! Предмет сгорел 🔥";
      document.getElementById('btnUpgrade').disabled = true;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }

    setTimeout(() => {
      wheel.style.transition = 'none';
      wheel.style.transform = 'rotate(0deg)';
      setTimeout(() => wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.15, 1)', 50);
      isSpinning = false;
      initProvablyFair();
      updateUI();
    }, 1500);

  }, 4000);
});

// Кнопка Вывести (отправка сообщения в бот администратору)
document.getElementById('btnWithdraw').addEventListener('click', () => {
  const current = UPGRADE_CHAIN[currentIndex];
  if (tg) {
    tg.sendData(JSON.stringify({ action: "withdraw", item: `${current.icon} ${current.name}` }));
    tg.close();
  } else {
    alert(`Запрос на вывод предмета: ${current.icon} ${current.name}`);
  }
});

updateUI();
