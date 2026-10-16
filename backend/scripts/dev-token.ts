import "dotenv/config";
import jwt from "jsonwebtoken";

const email = process.argv[2];
const name = process.argv[3] ?? "Test User";

if (!email) {
  console.log('Usage: npx tsx scripts/dev-token.ts you@vitstudent.ac.in "Your Name"');
  process.exit(1);
}

console.log(
  jwt.sign({ email: email.toLowerCase(), name, picture: null }, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  })
);