import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  VStack,
  HStack,
  Avatar,
  Input,
  FormControl,
  FormLabel,
  Switch,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const cardBg = useColorModeValue('white', 'gray.700');

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await apiRequest('PUT', '/api/user', data);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: "Perfil actualizado",
        description: "Tu información personal ha sido actualizada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('PUT', '/api/user/password', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente.",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cambiar contraseña",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('DELETE', '/api/user', { password });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada correctamente.",
      });
      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar cuenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y el email son obligatorios.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({ name, email });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error de validación",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error de validación",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      if (!deletePassword) {
        toast({
          title: "Contraseña requerida",
          description: "Debes ingresar tu contraseña para confirmar la eliminación.",
          variant: "destructive",
        });
        return;
      }
      deleteAccountMutation.mutate(deletePassword);
    }
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="4xl" py={8}>
        <VStack spacing={6} align="stretch">
          <VStack align="start" spacing={1}>
            <Heading size="lg">Mi Perfil</Heading>
            <Text color="gray.600">Edición de información personal del usuario</Text>
          </VStack>


          {/* Profile Information */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={6} align="stretch">
                <HStack spacing={6}>
                  <Avatar size="xl" name={name} />
                  <VStack align="start" spacing={2}>
                    <Heading size="md">{name}</Heading>
                    <Text color="gray.600">{email}</Text>
                    <Button size="sm" variant="outline">
                      Cambiar foto
                    </Button>
                  </VStack>
                </HStack>

                <Divider />

                <Heading size="md">Información Personal</Heading>

                <FormControl>
                  <FormLabel>Nombre completo</FormLabel>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Correo electrónico</FormLabel>
                  <Input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormControl>

                <Button 
                  colorScheme="blue" 
                  onClick={handleProfileUpdate}
                  isLoading={updateProfileMutation.isPending}
                  w="fit-content"
                >
                  Actualizar Información
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Change Password */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Cambiar Contraseña</Heading>

                <FormControl>
                  <FormLabel>Contraseña actual</FormLabel>
                  <Input 
                    type="password"
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <Input 
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <Input 
                    type="password"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </FormControl>

                <Button 
                  colorScheme="blue" 
                  onClick={handlePasswordChange}
                  isLoading={changePasswordMutation.isPending}
                  w="fit-content"
                  isDisabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  Cambiar Contraseña
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Notification Preferences */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Preferencias de Notificaciones</Heading>

                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Alertas de presupuesto</Text>
                    <Text fontSize="sm" color="gray.600">
                      Recibir notificaciones cuando superes el 80% del presupuesto
                    </Text>
                  </VStack>
                  <Switch defaultChecked />
                </HStack>

                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Transacciones automáticas</Text>
                    <Text fontSize="sm" color="gray.600">
                      Notificar cuando se detecten nuevas transacciones
                    </Text>
                  </VStack>
                  <Switch defaultChecked />
                </HStack>

                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Resumen semanal</Text>
                    <Text fontSize="sm" color="gray.600">
                      Recibir resumen de gastos cada semana
                    </Text>
                  </VStack>
                  <Switch />
                </HStack>

                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Actividad del equipo</Text>
                    <Text fontSize="sm" color="gray.600">
                      Notificar sobre cambios realizados por otros miembros
                    </Text>
                  </VStack>
                  <Switch defaultChecked />
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Danger Zone */}
          <Card bg={cardBg} borderColor="red.200" borderWidth="1px">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="red.500">Zona Peligrosa</Heading>

                <VStack align="stretch" spacing={4}>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Eliminar cuenta</Text>
                    <Text fontSize="sm" color="gray.600">
                      Eliminar permanentemente tu cuenta y todos los datos asociados
                    </Text>
                  </VStack>
                  
                  <FormControl maxW="300px">
                    <FormLabel>Confirma tu contraseña</FormLabel>
                    <Input 
                      type="password"
                      placeholder="Ingresa tu contraseña"
                      value={deletePassword} 
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </FormControl>

                  <Button 
                    colorScheme="red" 
                    variant="outline"
                    onClick={handleDeleteAccount}
                    isLoading={deleteAccountMutation.isPending}
                    isDisabled={!deletePassword}
                    w="fit-content"
                  >
                    Eliminar cuenta
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}