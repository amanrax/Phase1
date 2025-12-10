// Navigation configuration for Chiefdom Management Model
// Define all navigation groups and items with role-based access

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: string[];
}

// Main navigation configuration
export const NAV_GROUPS: NavGroup[] = [
  {
    title: '',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        icon: 'fa-solid fa-chart-line'
      }
    ]
  },
  {
    title: 'Farmer Management',
    items: [
      {
        path: '/farmers',
        label: 'All Farmers',
        icon: 'fa-solid fa-users'
      },
      {
        path: '/farmers/register',
        label: 'Register Farmer',
        icon: 'fa-solid fa-user-plus'
      },
      {
        path: '/farmers/pending',
        label: 'Pending Approvals',
        icon: 'fa-solid fa-clock'
      },
      {
        path: '/farmers/id-cards',
        label: 'ID Cards',
        icon: 'fa-solid fa-id-card'
      }
    ],
    roles: ['ADMIN', 'SUPER ADMIN', 'OPERATOR']
  },
  {
    title: 'Agriculture',
    items: [
      {
        path: '/crops',
        label: 'Crop Management',
        icon: 'fa-solid fa-wheat-awn'
      },
      {
        path: '/livestock',
        label: 'Livestock',
        icon: 'fa-solid fa-horse'
      },
      {
        path: '/land',
        label: 'Land Records',
        icon: 'fa-solid fa-map'
      }
    ],
    roles: ['ADMIN', 'SUPER ADMIN', 'OPERATOR']
  },
  {
    title: 'Reports & Analytics',
    items: [
      {
        path: '/reports',
        label: 'Reports',
        icon: 'fa-solid fa-file-chart-line'
      },
      {
        path: '/analytics',
        label: 'Analytics',
        icon: 'fa-solid fa-chart-pie'
      },
      {
        path: '/export',
        label: 'Data Export',
        icon: 'fa-solid fa-download'
      }
    ],
    roles: ['ADMIN', 'SUPER ADMIN']
  },
  {
    title: 'System Administration',
    items: [
      {
        path: '/users',
        label: 'User Management',
        icon: 'fa-solid fa-user-gear'
      },
      {
        path: '/districts',
        label: 'Districts',
        icon: 'fa-solid fa-location-dot'
      },
      {
        path: '/settings',
        label: 'System Settings',
        icon: 'fa-solid fa-gear'
      }
    ],
    roles: ['ADMIN', 'SUPER ADMIN']
  }
];

// Role-based home page mapping
export const ROLE_HOME_PAGES: Record<string, string> = {
  'SUPER ADMIN': '/dashboard',
  'ADMIN': '/dashboard',
  'OPERATOR': '/dashboard',
  'VIEWER': '/reports'
};

// Get home page for a specific role
export const getHomePageForRole = (role: string): string => {
  return ROLE_HOME_PAGES[role.toUpperCase()] || '/dashboard';
};
