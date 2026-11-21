// Which department room an agent sits in, from the role they already have. Display only:
// nothing else in HQ reads departments.

export type DepartmentId = "engineering" | "quality" | "design-docs" | "ops";

export interface Department {
  id: DepartmentId;
  label: string;
}

/** In building order: rooms are placed left to right in this order. */
export const DEPARTMENTS: Department[] = [
  { id: "engineering", label: "Engineering" },
  { id: "quality", label: "Quality" },
  { id: "design-docs", label: "Design & Docs" },
  { id: "ops", label: "Ops" },
];

const BY_ROLE: Record<string, DepartmentId> = {
  developer: "engineering",
  frontend: "engineering",
  "frontend developer": "engineering",
  backend: "engineering",
  "backend developer": "engineering",
  designer: "design-docs",
  docs: "design-docs",
  qa: "quality",
  "code reviewer": "quality",
  security: "quality",
  devops: "ops",
};

/** Any role not listed sits in Engineering. */
export function departmentOf(role: string): DepartmentId {
  return BY_ROLE[role.trim().toLowerCase()] ?? "engineering";
}

/** Non-empty departments in building order, members in input order. */
export function groupByDepartment<T extends { role: string }>(workers: T[]): { dept: Department; members: T[] }[] {
  return DEPARTMENTS.map((dept) => ({ dept, members: workers.filter((w) => departmentOf(w.role) === dept.id) })).filter(
    (g) => g.members.length > 0,
  );
}
