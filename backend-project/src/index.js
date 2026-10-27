require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://niyonsabakhalifa_db_user:zawad*2008@practicalexamedb.pug2nxt.mongodb.net/";
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });

const partSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  availableQuantity: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const movementFields = {
  partId: { type: Schema.Types.ObjectId, ref: "SparePart", required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
};

const stockInSchema = new Schema(movementFields, { timestamps: true });
const stockOutSchema = new Schema({
  ...movementFields,
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true, optimisticConcurrency: true });

stockInSchema.index({ date: -1, createdAt: -1 });
stockOutSchema.index({ date: -1, createdAt: -1 });

const User = model("User", userSchema);
const SparePart = model("SparePart", partSchema);
const StockIn = model("StockIn", stockInSchema);
const StockOut = model("StockOut", stockOutSchema);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "sims.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: "sessions",
    ttl: 8 * 60 * 60
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const isPositiveInt = (value) =>
  (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) &&
  Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 4294967295;
const isNonNegativeMoney = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value)) return false;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 9999999999.99 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
};
const validLineTotal = (quantity, unitPrice) =>
  Number(quantity) * Number(unitPrice) <= 999999999999.99;
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validId = (value) => mongoose.isValidObjectId(value);
const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ message: "Please sign in." });
  next();
};
const duplicateMessage = (error, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "A spare part with that name already exists." });
  }
  next(error);
};
const publicPart = (part) => ({
  id: part._id.toString(),
  name: part.name,
  category: part.category,
  quantity: part.quantity,
  unitPrice: part.unitPrice,
  totalPrice: part.totalPrice,
  availableQuantity: part.availableQuantity
});
const publicMovement = (movement, user = false) => ({
  id: movement._id.toString(),
  partId: movement.partId._id.toString(),
  partName: movement.partId.name,
  quantity: movement.quantity,
  unitPrice: movement.unitPrice,
  totalPrice: movement.totalPrice,
  date: movement.date,
  ...(user ? { username: movement.userId.username } : {})
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const user = await User.findOne({ username }).select("+passwordHash");
  const valid = user && await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid username or password." });
  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => error ? reject(error) : resolve())
  );
  req.session.user = { id: user._id.toString(), username: user.username };
  res.json({ user: req.session.user });
}));

app.post("/api/auth/logout", requireLogin, asyncRoute(async (req, res) => {
  await new Promise((resolve, reject) =>
    req.session.destroy((error) => error ? reject(error) : resolve())
  );
  res.clearCookie("sims.sid", { httpOnly: true, sameSite: "lax" });
  res.status(204).end();
}));

app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/auth/")) return next();
  requireLogin(req, res, next);
});

app.get("/api/parts", asyncRoute(async (_req, res) => {
  const parts = await SparePart.find().sort({ name: 1 }).lean();
  res.json(parts.map(publicPart));
}));

app.post("/api/parts", asyncRoute(async (req, res, next) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unitPrice);
  if (!name || name.length > 120 || !category || category.length > 100 ||
      !Number.isInteger(quantity) || quantity < 0 || quantity > 4294967295 ||
      !isNonNegativeMoney(body.unitPrice) || !validLineTotal(quantity, unitPrice)) {
    return res.status(400).json({ message: "Enter a name, category, non-negative quantity, and valid unit price." });
  }
  try {
    const part = await SparePart.create({
      name, category, quantity, unitPrice,
      totalPrice: quantity * unitPrice,
      availableQuantity: quantity
    });
    res.status(201).json({ id: part._id.toString(), message: "Spare part saved." });
  } catch (error) {
    duplicateMessage(error, res, next);
  }
}));

app.get("/api/stock-ins", asyncRoute(async (_req, res) => {
  const movements = await StockIn.find()
    .populate("partId", "name")
    .sort({ date: -1, _id: -1 });
  res.json(movements.map((movement) => publicMovement(movement)));
}));

app.post("/api/stock-ins", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const { partId, quantity, unitPrice, date } = body;
  if (!validId(partId) || !isPositiveInt(quantity) || !isNonNegativeMoney(unitPrice) ||
      !validLineTotal(quantity, unitPrice) || !validDate(date)) {
    return res.status(400).json({ message: "Select a part and enter a positive quantity, valid unit price, and date." });
  }
  const part = await SparePart.findById(partId);
  if (!part) return res.status(404).json({ message: "Spare part not found." });
  const updatedPart = await SparePart.findOneAndUpdate(
    { _id: partId },
    { $inc: { availableQuantity: Number(quantity) } },
    { new: true }
  );
  if (!updatedPart) return res.status(404).json({ message: "Spare part not found." });
  try {
    const movement = await StockIn.create({
      partId, quantity: Number(quantity), unitPrice: Number(unitPrice),
      totalPrice: Number(quantity) * Number(unitPrice), date
    });
    res.status(201).json({ id: movement._id.toString(), message: "Stock-in saved." });
  } catch (error) {
    await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: -Number(quantity) } });
    throw error;
  }
}));

async function reserveStock(partId, quantity) {
  const part = await SparePart.findOneAndUpdate(
    { _id: partId, availableQuantity: { $gte: quantity } },
    { $inc: { availableQuantity: -quantity } },
    { new: true }
  );
  if (part) return { part, insufficient: false };
  const existingPart = await SparePart.findById(partId).select("availableQuantity").lean();
  return {
    part: null,
    insufficient: Boolean(existingPart),
    availableQuantity: existingPart?.availableQuantity
  };
}

app.get("/api/stock-outs", asyncRoute(async (_req, res) => {
  const movements = await StockOut.find()
    .populate("partId", "name")
    .populate("userId", "username")
    .sort({ date: -1, _id: -1 });
  res.json(movements.map((movement) => publicMovement(movement, true)));
}));

async function saveStockOut(req, res, isUpdate) {
  const body = req.body || {};
  const id = isUpdate ? req.params.id : null;
  const { partId, quantity, unitPrice, date } = body;
  if ((isUpdate && !validId(id)) || !validId(partId) || !isPositiveInt(quantity) ||
      !isNonNegativeMoney(unitPrice) || !validLineTotal(quantity, unitPrice) || !validDate(date)) {
    return res.status(400).json({ message: "Select a part and enter a positive quantity, valid unit price, and date." });
  }

  const normalizedQuantity = Number(quantity);
  let movement = isUpdate ? await StockOut.findById(id) : null;
  if (isUpdate && !movement) {
    return res.status(404).json({ message: "Stock-out record not found." });
  }

  if (!isUpdate) {
    const reservation = await reserveStock(partId, normalizedQuantity);
    if (!reservation.part) {
      return res.status(reservation.insufficient ? 400 : 404).json({
        message: reservation.insufficient
          ? `Not enough stock. Available quantity: ${reservation.availableQuantity}.`
          : "Spare part not found."
      });
    }
    try {
      movement = await StockOut.create({
        partId, userId: req.session.user.id,
        quantity: normalizedQuantity,
        unitPrice: Number(unitPrice),
        totalPrice: normalizedQuantity * Number(unitPrice),
        date
      });
    } catch (error) {
      await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: normalizedQuantity } });
      throw error;
    }
    return res.status(201).json({ id: movement._id.toString(), message: "Stock-out saved." });
  }

  const oldPartId = movement.partId.toString();
  const oldQuantity = movement.quantity;
  const samePart = oldPartId === partId;
  const delta = normalizedQuantity - oldQuantity;
  let newPartReserved = false;
  let oldPartRestocked = false;
  let samePartAdjustment = false;

  if (samePart && delta > 0) {
    const reservation = await reserveStock(partId, delta);
    if (!reservation.part) {
      return res.status(reservation.insufficient ? 400 : 404).json({
        message: reservation.insufficient
          ? `Not enough stock. Available quantity: ${reservation.availableQuantity}.`
          : "Spare part not found."
      });
    }
    samePartAdjustment = true;
  } else if (samePart && delta < 0) {
    await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: -delta } });
    samePartAdjustment = true;
  } else {
    const reservation = await reserveStock(partId, normalizedQuantity);
    if (!reservation.part) {
      return res.status(reservation.insufficient ? 400 : 404).json({
        message: reservation.insufficient
          ? `Not enough stock. Available quantity: ${reservation.availableQuantity}.`
          : "Spare part not found."
      });
    }
    newPartReserved = true;
    const oldPart = await SparePart.findByIdAndUpdate(
      oldPartId, { $inc: { availableQuantity: oldQuantity } }, { new: true }
    );
    if (!oldPart) {
      await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: normalizedQuantity } });
      return res.status(404).json({ message: "The original spare part no longer exists." });
    }
    oldPartRestocked = true;
  }

  try {
    movement.partId = partId;
    movement.quantity = normalizedQuantity;
    movement.unitPrice = Number(unitPrice);
    movement.totalPrice = normalizedQuantity * Number(unitPrice);
    movement.date = date;
    await movement.save();
  } catch (error) {
    if (samePartAdjustment) {
      await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: delta } });
    } else {
      if (oldPartRestocked) {
        await SparePart.updateOne({ _id: oldPartId }, { $inc: { availableQuantity: -oldQuantity } });
      }
      if (newPartReserved) {
        await SparePart.updateOne({ _id: partId }, { $inc: { availableQuantity: normalizedQuantity } });
      }
    }
    throw error;
  }
  res.json({ message: "Stock-out updated." });
}

app.post("/api/stock-outs", asyncRoute(async (req, res) => saveStockOut(req, res, false)));
app.put("/api/stock-outs/:id", asyncRoute(async (req, res) => saveStockOut(req, res, true)));
app.delete("/api/stock-outs/:id", asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid stock-out ID." });
  const movement = await StockOut.findById(req.params.id);
  if (!movement) return res.status(404).json({ message: "Stock-out record not found." });
  await SparePart.updateOne(
    { _id: movement.partId },
    { $inc: { availableQuantity: movement.quantity } }
  );
  let deleted;
  try {
    deleted = await StockOut.findOneAndDelete({
      _id: movement._id,
      __v: movement.__v
    });
  } catch (error) {
    await SparePart.updateOne(
      { _id: movement.partId },
      { $inc: { availableQuantity: -movement.quantity } }
    );
    throw error;
  }
  if (!deleted) {
    await SparePart.updateOne(
      { _id: movement.partId },
      { $inc: { availableQuantity: -movement.quantity } }
    );
    return res.status(409).json({ message: "Stock-out changed while deleting. Refresh and try again." });
  }
  res.status(204).end();
}));

app.get("/api/reports/daily", asyncRoute(async (req, res) => {
  const date = req.query.date;
  if (!validDate(date)) {
    return res.status(400).json({ message: "Provide a valid date in YYYY-MM-DD format." });
  }
  const parts = await SparePart.find().sort({ name: 1 }).lean();
  const [stockInTotals, stockOutTotals, dailyStockOuts] = await Promise.all([
    StockIn.aggregate([
      { $match: { date: { $lte: date } } },
      { $group: { _id: "$partId", quantity: { $sum: "$quantity" } } }
    ]),
    StockOut.aggregate([
      { $match: { date: { $lte: date } } },
      { $group: { _id: "$partId", quantity: { $sum: "$quantity" } } }
    ]),
    StockOut.find({ date })
      .populate("partId", "name")
      .populate("userId", "username")
      .sort({ _id: -1 })
  ]);
  const incomingByPart = new Map(stockInTotals.map((row) => [row._id.toString(), row.quantity]));
  const outgoingByPart = new Map(stockOutTotals.map((row) => [row._id.toString(), row.quantity]));
  const stockStatus = parts.map((part) => {
    const partId = part._id.toString();
    const stockOutQuantity = outgoingByPart.get(partId) || 0;
    const storedQuantity = part.quantity + (incomingByPart.get(partId) || 0);
    return {
      partId,
      partName: part.name,
      storedQuantity,
      stockOutQuantity,
      remainingQuantity: storedQuantity - stockOutQuantity
    };
  });
  res.json({
    date,
    stockStatus,
    stockOuts: dailyStockOuts.map((movement) => publicMovement(movement, true))
  });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === "CastError" || error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  res.status(500).json({ message: "An unexpected server error occurred." });
});

async function start() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  app.listen(port, () => {
    console.log(`SIMS API listening on http://localhost:${port}`);
    console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);
  });
}

start().catch((error) => {
  console.error("Could not start SIMS API:", error.message);
  process.exitCode = 1;
});
