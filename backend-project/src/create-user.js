require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function main() {
  const username = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!username || username.length > 80 || !password || password.length < 12) {
    throw new Error(
      "Set ADMIN_USERNAME (up to 80 characters) and an ADMIN_PASSWORD of at least 12 characters."
    );
  }

  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/SIMS",
    { serverSelectionTimeoutMS: 5000 }
  );
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { username },
    { $set: { passwordHash } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(`User "${username}" is ready.`);
}

main()
  .catch((error) => {
    console.error("Could not create user:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
