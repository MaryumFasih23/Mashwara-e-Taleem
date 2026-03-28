import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/User.js";

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/mashwara_test");
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

// Clean database before each test
beforeEach(async () => {
  await User.deleteMany({});
});

describe("POST /api/users/create", () => {

  // -------------------------
  // TC-06 Valid Signup
  // -------------------------
  test("TC-06: Should create a new user", async () => {
    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: "uid12345",
        name: "Test User",
        email: "testuser@gmail.com",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty("uid", "uid12345");
    expect(res.body.user).toHaveProperty("email", "testuser@gmail.com");
  });

  // -------------------------
  // TC-07 Duplicate User
  // -------------------------
  test("TC-07: Should reject duplicate user", async () => {
    await User.create({
      uid: "duplicateUID",
      name: "Old User",
      email: "olduser@gmail.com",
    });

    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: "duplicateUID",
        name: "New User",
        email: "olduser@gmail.com",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("User already exists");
  });

  // -------------------------
  // TC-01 Missing Fields
  // -------------------------
  test("TC-01: Should reject missing fields", async () => {
    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: "",
        name: "",
        email: "",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing required fields");
  });

  // -------------------------
  // TC-02 Invalid Email Format
  // -------------------------
  test("TC-02: Should reject invalid email format", async () => {
    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: "uid999",
        name: "Test User",
        email: "wrong-email-format",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid email format");
  });

  // -------------------------
  // TC-09 Wrong Data Types
  // -------------------------
  test("TC-09: Should reject invalid field types", async () => {
    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: 100,
        name: { bad: "object" },
        email: ["list@gmail.com"],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid data types");
  });

  // -------------------------
  // TC-14 HTML Injection
  // -------------------------
  test("TC-14: Should sanitize script injection", async () => {
    const res = await request(app)
      .post("/api/users/create")
      .send({
        uid: "uidInject",
        name: "<script>alert('xss')</script>",
        email: "clean@gmail.com",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.name.includes("<script>")).toBe(false);
  });

});
