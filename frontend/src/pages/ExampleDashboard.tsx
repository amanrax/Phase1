import React, { useEffect, useState } from 'react';
import { DashboardLayout, StatCard, Table, Card, Badge } from '../components/ui';
import { NAV_GROUPS } from '../config/navigation';

// Example Dashboard Page using the new UI components
const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statsData, setStatsData] = useState({
    totalFarmers: 1240,
    pendingApprovals: 42,
    registeredThisMonth: 156,
    activeUsers: 24
  });

  // Example table data
  const recentRegistrations = [
    {
      id: 1,
      name: 'John Mwanza',
      nrc: 'ZM123456',
      district: 'Lusaka',
      date: '2025-11-20',
      status: 'Pending'
    },
    {
      id: 2,
      name: 'Sarah Banda',
      nrc: 'ZM234567',
      district: 'Kitwe',
      date: '2025-11-21',
      status: 'Approved'
    },
    {
      id: 3,
      name: 'David Phiri',
      nrc: 'ZM345678',
      district: 'Ndola',
      date: '2025-11-22',
      status: 'Pending'
    }
  ];

  const tableColumns = [
    { key: 'name', label: 'Name' },
    { key: 'nrc', label: 'NRC' },
    { key: 'district', label: 'District' },
    { key: 'date', label: 'Registration Date' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Approved' ? 'green' : 'yellow'}>
          {value}
        </Badge>
      )
    }
  ];

  useEffect(() => {
    // Fetch dashboard data here
    // This is just example data
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic here
  };

  return (
    <DashboardLayout
      navGroups={NAV_GROUPS}
      pageTitle="Dashboard"
      showSearch
      onSearchChange={handleSearch}
    >
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          label="Total Farmers"
          value={statsData.totalFarmers.toLocaleString()}
          icon="fa-solid fa-users"
          borderColor="green"
          trend="+12% this month"
        />
        <StatCard
          label="Pending Approvals"
          value={statsData.pendingApprovals}
          icon="fa-solid fa-clock"
          borderColor="orange"
        />
        <StatCard
          label="This Month"
          value={statsData.registeredThisMonth}
          icon="fa-solid fa-calendar"
          borderColor="blue"
          trend="+8% from last month"
        />
        <StatCard
          label="Active Users"
          value={statsData.activeUsers}
          icon="fa-solid fa-user-check"
          borderColor="purple"
        />
      </div>

      {/* Recent Registrations Table */}
      <div className="mb-6">
        <Table
          title="Recent Registrations"
          columns={tableColumns}
          data={recentRegistrations}
        />
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-chart-pie text-green-700 mr-2"></i>
            Distribution by District
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Lusaka</span>
              <span className="text-sm font-bold text-gray-800">340</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-700 h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Kitwe</span>
              <span className="text-sm font-bold text-gray-800">245</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-700 h-2 rounded-full" style={{ width: '49%' }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ndola</span>
              <span className="text-sm font-bold text-gray-800">198</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-700 h-2 rounded-full" style={{ width: '39%' }}></div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-bell text-orange-600 mr-2"></i>
            Recent Notifications
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-orange-500 pl-3 py-2">
              <p className="text-sm font-semibold text-gray-800">42 farmers pending approval</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
            <div className="border-l-4 border-green-600 pl-3 py-2">
              <p className="text-sm font-semibold text-gray-800">ID cards generated successfully</p>
              <p className="text-xs text-gray-500">5 hours ago</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-3 py-2">
              <p className="text-sm font-semibold text-gray-800">New system update available</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
