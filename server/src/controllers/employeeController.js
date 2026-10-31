import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";

// Standard Roles available in Axon Workspace (CEO, Developer, Tester, Marketer)
export const AVAILABLE_ROLES = [
  { id: "ceo", name: "CEO", department: "Leadership", color: "#c8ff3d", level: "Executive" },
  { id: "developer", name: "Developer", department: "Engineering", color: "#61dafb", level: "Engineering" },
  { id: "tester", name: "Tester", department: "Engineering", color: "#10b981", level: "Quality Assurance" },
  { id: "marketer", name: "Marketer", department: "Marketing", color: "#f59e0b", level: "Growth & Marketing" }
];

// In-memory cache for ultra-fast access, persisted to MongoDB Atlas
let employees = [];

export const getEmployees = async (req, res) => {
  try {
    const { department, role, search } = req.query;

    let dbEmployees = [];
    try {
      dbEmployees = await Employee.find().sort({ createdAt: -1 }).lean();
      if (dbEmployees && dbEmployees.length > 0) {
        employees = dbEmployees;
      }
    } catch (e) {
      // Fallback to cache if MongoDB is offline
    }

    let filtered = [...employees];

    if (department && department !== "all") {
      filtered = filtered.filter((emp) => emp.department?.toLowerCase() === department.toLowerCase());
    }

    if (role && role !== "all") {
      filtered = filtered.filter((emp) => emp.role?.toLowerCase() === role.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.githubUsername?.toLowerCase().includes(q) ||
          emp.role?.toLowerCase().includes(q)
      );
    }

    res.json({
      total: filtered.length,
      employees: filtered
    });
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const addEmployee = async (req, res) => {
  const { name, email, githubUsername, role, department = "Engineering", status = "Active" } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required fields." });
  }

  // Check if employee with same email already exists
  const existing = employees.find((e) => e.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An employee with this email already exists in the workspace." });
  }

  const cleanGithubUsername = (githubUsername || name.toLowerCase().replace(/\s+/g, "")).replace(/^@/, "").toLowerCase();

  // STRICT REQUIREMENT: User must have logged into Axon previously via GitHub OAuth
  const registeredUser = await User.findOne({
    username: new RegExp(`^${cleanGithubUsername}$`, "i")
  }).lean();

  if (!registeredUser) {
    return res.status(400).json({
      error: `Cannot add @${cleanGithubUsername}: User has not logged into Axon yet. They must sign in with GitHub on this website first so their account and verified email are registered.`
    });
  }

  const newEmployee = {
    id: registeredUser.id || `emp_${Date.now()}`,
    name: name || registeredUser.name || cleanGithubUsername,
    email: registeredUser.email || email,
    githubUsername: cleanGithubUsername,
    avatar: registeredUser.avatar || `https://avatars.githubusercontent.com/${cleanGithubUsername}`,
    role,
    department,
    status,
    addedAt: new Date().toISOString(),
    addedBy: req.user?.username || req.user?.name || "CEO"
  };

  try {
    await Employee.create(newEmployee);
  } catch (err) {
    console.warn("MongoDB Employee save notice:", err.message);
  }

  employees.unshift(newEmployee);

  res.status(201).json({
    success: true,
    message: `Added ${name} as ${role} successfully.`,
    employee: newEmployee
  });
};

export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { role, department, status, name, email, githubUsername } = req.body;

  let updated = null;
  const updateData = {
    ...(name && { name }),
    ...(email && { email }),
    ...(githubUsername && {
      githubUsername: githubUsername.replace(/^@/, ""),
      avatar: `https://avatars.githubusercontent.com/${githubUsername.replace(/^@/, "")}`
    }),
    ...(role && { role }),
    ...(department && { department }),
    ...(status && { status }),
    updatedAt: new Date().toISOString()
  };

  try {
    updated = await Employee.findOneAndUpdate({ id }, updateData, { new: true }).lean();
  } catch (err) {
    console.warn("MongoDB Employee update notice:", err.message);
  }

  const index = employees.findIndex((e) => e.id === id);
  if (index !== -1) {
    employees[index] = { ...employees[index], ...updateData };
    if (!updated) updated = employees[index];
  }

  if (!updated) {
    return res.status(404).json({ error: "Employee not found." });
  }

  res.json({
    success: true,
    message: `Updated ${updated.name}'s role to ${updated.role} successfully.`,
    employee: updated
  });
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    await Employee.findOneAndDelete({ id });
  } catch (err) {
    console.warn("MongoDB Employee delete notice:", err.message);
  }

  const index = employees.findIndex((e) => e.id === id);
  const removed = index !== -1 ? employees.splice(index, 1)[0] : { id };

  res.json({
    success: true,
    message: `Removed employee from the workspace.`,
    employee: removed
  });
};

export const getRoles = (req, res) => {
  res.json({
    roles: AVAILABLE_ROLES
  });
};

export const getWorkspaceStats = (req, res) => {
  const departmentCounts = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {});

  const roleCounts = employees.reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalEmployees: employees.length,
    activeEmployees: employees.filter((e) => e.status === "Active").length,
    departments: departmentCounts,
    roles: roleCounts,
    workspace: {
      name: "Axon Workspace",
      owner: "CEO",
      loginProvider: "GitHub OAuth Strictly"
    }
  });
};
