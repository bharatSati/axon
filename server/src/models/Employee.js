import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    githubUsername: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, default: "Engineering" },
    status: { type: String, default: "Active" },
    avatar: { type: String }
  },
  {
    timestamps: true
  }
);

export const Employee =
  mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
