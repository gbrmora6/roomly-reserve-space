// Temporary TypeScript fixes to resolve build errors
// This file contains workarounds for complex type issues

export const fixBuildErrors = () => {
  // This is a placeholder file to help resolve TypeScript build errors
  // Individual files will be fixed as needed
  console.log('Build error fixes applied');
};

// Common interfaces to help with type issues
export interface MinimalPermission {
  userId: string;
  resourceType: string;
  permissionType: string;
  branchId: string;
  expiresAt?: string;
  notes?: string;
}

export interface MinimalEquipment {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price_per_hour: number;
  branch_id: string;
}

export interface MinimalRoom {
  id: string;
  name: string;
  description?: string;
  price_per_hour: number;
  branch_id: string;
}