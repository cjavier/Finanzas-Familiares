import {
  Box,
  Flex,
  HStack,
  Link,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
  Heading,
  Badge,
  Avatar,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon, BellIcon } from '@chakra-ui/icons';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { 
  FaHome, 
  FaExchangeAlt, 
  FaRobot, 
  FaUser, 
  FaSignOutAlt,
  FaTags,
  FaChartPie,
  FaRuler,
  FaFile,
  FaUsers
} from 'react-icons/fa';

const Links = [
  { name: 'Dashboard', href: '/dashboard', icon: FaHome },
  { name: 'Transacciones', href: '/transactions', icon: FaExchangeAlt },
  { name: 'Categorías', href: '/categories', icon: FaTags },
  { name: 'Presupuestos', href: '/budgets', icon: FaChartPie },
  { name: 'Reglas', href: '/rules', icon: FaRuler },
  { name: 'Archivos', href: '/files', icon: FaFile },
  { name: 'Equipo', href: '/team', icon: FaUsers },
];

const NavLink = ({ children, href, icon: Icon, ...rest }: any) => {
  const [location, navigate] = useLocation();
  const isActive = location === href;
  
  return (
    <Link
      px={2}
      py={1}
      rounded={'md'}
      bg={isActive ? 'blue.500' : 'transparent'}
      color={isActive ? 'white' : 'gray.600'}
      _hover={{
        textDecoration: 'none',
        bg: isActive ? 'blue.600' : 'gray.200',
      }}
      onClick={() => navigate(href)}
      {...rest}
    >
      <HStack spacing={2}>
        <Icon size={16} />
        <Text>{children}</Text>
      </HStack>
    </Link>
  );
};

export default function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [, navigate] = useLocation();
  const { logoutMutation } = useAuth();

  // Fetch notifications to show unread count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Logout successful - redirect to landing page
        navigate('/');
      },
      onError: (error) => {
        console.error('Logout failed:', error);
        // Even if logout fails, redirect to home for security
        navigate('/');
      },
    });
  };

  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <>
      <Box bg={bgColor} borderBottom={1} borderStyle={'solid'} borderColor={borderColor}>
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'} px={6}>
          <IconButton
            size={'md'}
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label={'Abrir Menu'}
            display={{ md: 'none' }}
            onClick={isOpen ? onClose : onOpen}
          />
          
          <HStack spacing={8} alignItems={'center'}>
            <Heading
              size="lg"
              color="blue.500"
              cursor="pointer"
              onClick={() => navigate('/dashboard')}
            >
              Finanzas Familiares
            </Heading>
            <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
              {Links.map((link) => (
                <NavLink key={link.name} href={link.href} icon={link.icon}>
                  {link.name}
                </NavLink>
              ))}
            </HStack>
          </HStack>

          <Flex alignItems={'center'}>
            <HStack spacing={4}>
              {/* AI Agent Button */}
              <Button
                colorScheme="purple"
                size="sm"
                leftIcon={<FaRobot />}
                onClick={() => navigate('/agente')}
              >
                Agente
              </Button>

              {/* Notifications */}
              <Box position="relative">
                <IconButton
                  aria-label={'Notificaciones'}
                  icon={<BellIcon />}
                  variant={'ghost'}
                  onClick={() => navigate('/notifications')}
                />
                {unreadCount > 0 && (
                  <Badge
                    colorScheme="red"
                    position="absolute"
                    top="-1"
                    right="-1"
                    fontSize="xs"
                    borderRadius="full"
                    minW="20px"
                    h="20px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Box>

              {/* User Menu */}
              <Menu>
                <MenuButton
                  as={Button}
                  rounded={'full'}
                  variant={'link'}
                  cursor={'pointer'}
                  minW={0}
                >
                  <Avatar size={'sm'} src={''} />
                </MenuButton>
                <MenuList>
                  <MenuItem icon={<FaUser />} onClick={() => navigate('/profile')}>
                    Mi Perfil
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem 
                    icon={<FaSignOutAlt />} 
                    onClick={handleLogout}
                    isDisabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? 'Cerrando...' : 'Cerrar Sesión'}
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Flex>

        {isOpen ? (
          <Box pb={4} display={{ md: 'none' }}>
            <Stack as={'nav'} spacing={4} px={6}>
              {Links.map((link) => (
                <NavLink key={link.name} href={link.href} icon={link.icon}>
                  {link.name}
                </NavLink>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </>
  );
}