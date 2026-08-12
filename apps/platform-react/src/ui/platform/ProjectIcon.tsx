import type { ComponentType } from 'react';

import {
  AppstoreOutlined,
  BankOutlined,
  BookOutlined,
  CarOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FormOutlined,
  GiftOutlined,
  HomeOutlined,
  MobileOutlined,
  OrderedListOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@/ui/ant/icons';

const iconMap: Record<string, ComponentType> = {
  Appstore: AppstoreOutlined,
  Bank: BankOutlined,
  Book: BookOutlined,
  Car: CarOutlined,
  Dashboard: DashboardOutlined,
  Database: DatabaseOutlined,
  Document: FileTextOutlined,
  Dollar: DollarOutlined,
  Environment: EnvironmentOutlined,
  FileText: FileTextOutlined,
  Form: FormOutlined,
  Gift: GiftOutlined,
  Home: HomeOutlined,
  House: HomeOutlined,
  List: OrderedListOutlined,
  Management: SettingOutlined,
  Mobile: MobileOutlined,
  OfficeBuilding: BankOutlined,
  Project: ProjectOutlined,
  SafetyCertificate: SafetyCertificateOutlined,
  Setting: SettingOutlined,
  Shop: ShopOutlined,
  Team: TeamOutlined,
  Tickets: GiftOutlined,
  Tool: ToolOutlined,
  User: UserOutlined,
  Van: CarOutlined,
};

export function ProjectIcon({ name }: { name?: string }) {
  const Icon = iconMap[name || ''] || FileTextOutlined;
  return <Icon />;
}
