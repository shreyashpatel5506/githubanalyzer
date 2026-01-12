const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
);

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
