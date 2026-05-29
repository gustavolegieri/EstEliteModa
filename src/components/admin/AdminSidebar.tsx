import { CreditCard, Settings, Users, LayoutDashboard, ArrowLeft, Images, DollarSign, Receipt, Repeat } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const items = [
  { title: 'Visão Geral', url: '/admin', icon: LayoutDashboard },
  { title: 'Financeiro', url: '/admin/finance', icon: DollarSign },
  { title: 'Pagamentos', url: '/admin/payments', icon: Receipt },
  { title: 'Assinaturas', url: '/admin/subscriptions', icon: Repeat },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Planos', url: '/admin/plans', icon: CreditCard },
  { title: 'Biblioteca', url: '/admin/library', icon: Images },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {!collapsed && 'Voltar ao site'}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
