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
  Badge,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Team, User } from '@shared/schema';
import { FaPlus, FaEdit, FaTrash, FaEllipsisV, FaCopy, FaSyncAlt } from 'react-icons/fa';

interface TeamWithMembers extends Team {
  members: User[];
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const cardBg = useColorModeValue('white', 'gray.700');

  // Fetch team data
  const { data: teamData, isLoading: teamLoading } = useQuery<TeamWithMembers>({
    queryKey: ['/api/team'],
    enabled: !!user,
  });

  // Initialize form with team data
  useEffect(() => {
    if (teamData) {
      setTeamName(teamData.name);
    }
  }, [teamData]);

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest('PUT', '/api/team', data);
      return await res.json();
    },
    onSuccess: (updatedTeam) => {
      queryClient.setQueryData(['/api/team'], (oldData: TeamWithMembers | undefined) => ({
        ...oldData!,
        ...updatedTeam
      }));
      toast({
        title: "Equipo actualizado",
        description: "La información del equipo ha sido actualizada correctamente.",
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

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/team/invite', { email });
      return await res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${result.email}. Código: ${result.inviteCode}`,
      });
      setInviteEmail('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar invitación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Regenerate invite code mutation
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/team/invite-code/regenerate');
      return await res.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['/api/team'], (oldData: TeamWithMembers | undefined) => ({
        ...oldData!,
        inviteCode: result.inviteCode
      }));
      toast({
        title: "Código regenerado",
        description: "Se ha generado un nuevo código de invitación.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al regenerar código",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change member role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await apiRequest('PUT', `/api/team/members/${memberId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      toast({
        title: "Rol actualizado",
        description: "El rol del miembro ha sido actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cambiar rol",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest('DELETE', `/api/team/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      toast({
        title: "Miembro eliminado",
        description: "El miembro ha sido eliminado del equipo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar miembro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'blue' : 'gray';
  };

  const handleUpdateTeam = () => {
    if (!teamName.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del equipo es obligatorio.",
        variant: "destructive",
      });
      return;
    }
    updateTeamMutation.mutate({ name: teamName.trim() });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error de validación",
        description: "El email es obligatorio.",
        variant: "destructive",
      });
      return;
    }
    inviteMemberMutation.mutate(inviteEmail.trim());
  };

  const copyInviteCode = () => {
    if (teamData?.inviteCode) {
      navigator.clipboard.writeText(teamData.inviteCode);
      toast({
        title: "Código copiado",
        description: "El código de invitación ha sido copiado al portapapeles.",
      });
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    const roleText = newRole === 'admin' ? 'administrador' : 'miembro';
    if (confirm(`¿Estás seguro de cambiar el rol de este miembro a ${roleText}?`)) {
      changeRoleMutation.mutate({ memberId, role: newRole });
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${memberName} del equipo? Esta acción no se puede deshacer.`)) {
      removeMemberMutation.mutate(memberId);
    }
  };

  if (teamLoading) {
    return (
      <Box>
        <Navigation />
        <Container maxW="6xl" py={8}>
          <Text>Cargando...</Text>
        </Container>
      </Box>
    );
  }

  const isAdmin = user?.role === 'admin';
  const members = teamData?.members || [];

  return (
    <Box>
      <Navigation />
      
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          <VStack align="start" spacing={1}>
            <Heading size="lg">Gestión de Equipo/Familia</Heading>
            <Text color="gray.600">Gestión de miembros del equipo/familia</Text>
          </VStack>

          {/* Team Info */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Información del Equipo</Heading>
                
                <FormControl>
                  <FormLabel>Nombre del equipo</FormLabel>
                  <HStack>
                    <Input 
                      value={teamName} 
                      onChange={(e) => setTeamName(e.target.value)}
                      isDisabled={!isAdmin}
                    />
                    {isAdmin && (
                      <Button 
                        colorScheme="blue" 
                        size="sm"
                        onClick={handleUpdateTeam}
                        isLoading={updateTeamMutation.isPending}
                      >
                        Guardar
                      </Button>
                    )}
                  </HStack>
                  {!isAdmin && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Solo los administradores pueden editar el nombre del equipo
                    </Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Código de invitación</FormLabel>
                  <HStack>
                    <Input value={teamData?.inviteCode || ''} isReadOnly />
                    <IconButton
                      aria-label="Copiar código"
                      icon={<FaCopy />}
                      onClick={copyInviteCode}
                      size="sm"
                    />
                    {isAdmin && (
                      <IconButton
                        aria-label="Regenerar código"
                        icon={<FaSyncAlt />}
                        onClick={() => regenerateCodeMutation.mutate()}
                        size="sm"
                        variant="outline"
                        isLoading={regenerateCodeMutation.isPending}
                      />
                    )}
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Comparte este código para que otros se unan a tu equipo
                    {isAdmin && " (solo administradores pueden regenerarlo)"}
                  </Text>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Invite New Member */}
          {isAdmin && (
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Invitar Nuevo Miembro</Heading>
                  
                  <HStack>
                    <Input
                      placeholder="correo@ejemplo.com"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Button 
                      colorScheme="blue" 
                      leftIcon={<FaPlus />}
                      onClick={handleInvite}
                      isDisabled={!inviteEmail}
                      isLoading={inviteMemberMutation.isPending}
                    >
                      Invitar
                    </Button>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Se enviará un email con el código de invitación al nuevo miembro
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Team Members */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Miembros del Equipo ({members.length})</Heading>
                
                <VStack spacing={3}>
                  {members.map((member) => (
                    <HStack 
                      key={member.id} 
                      p={4} 
                      borderRadius="md" 
                      border="1px"
                      borderColor="gray.200"
                      w="full"
                      justify="space-between"
                    >
                      <HStack spacing={4} flex={1}>
                        <Avatar size="md" name={member.name} />
                        <VStack align="start" spacing={1}>
                          <HStack spacing={2}>
                            <Text fontWeight="bold">{member.name}</Text>
                            <Badge colorScheme={getRoleColor(member.role)}>
                              {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </Badge>
                            {member.id === user?.id && (
                              <Badge colorScheme="green" variant="outline">
                                Tú
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {member.email}
                          </Text>
                          <HStack spacing={4} fontSize="xs" color="gray.500">
                            <Text>
                              Se unió: {new Date(member.createdAt).toLocaleDateString('es-ES')}
                            </Text>
                            <Text>
                              Activo: {member.isActive ? 'Sí' : 'No'}
                            </Text>
                          </HStack>
                        </VStack>
                      </HStack>
                      
                      {isAdmin && member.id !== user?.id && (
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Opciones"
                            icon={<FaEllipsisV />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            {member.role === 'member' ? (
                              <MenuItem 
                                icon={<FaEdit />}
                                onClick={() => handleRoleChange(member.id, 'admin')}
                              >
                                Promover a Admin
                              </MenuItem>
                            ) : (
                              <MenuItem 
                                icon={<FaEdit />}
                                onClick={() => handleRoleChange(member.id, 'member')}
                              >
                                Degradar a Miembro
                              </MenuItem>
                            )}
                            <MenuItem 
                              icon={<FaTrash />} 
                              color="red.500"
                              onClick={() => handleRemoveMember(member.id, member.name)}
                            >
                              Eliminar del equipo
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}