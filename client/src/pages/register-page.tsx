import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
  Link,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { translateErrorMessage } from '@/lib/utils';

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { registerMutation } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmit = async (e: React.FormEvent, isNewTeam: boolean) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (isNewTeam && !teamName.trim()) {
      setError('El nombre del equipo es requerido');
      return;
    }

    if (!isNewTeam && !inviteCode.trim()) {
      setError('El código de invitación es requerido');
      return;
    }

    const payload = {
      name,
      email,
      password,
      ...(isNewTeam ? { teamName } : { inviteCode }),
    };

    registerMutation.mutate(payload, {
      onSuccess: () => {
        // Registration successful - redirect to onboarding
        navigate('/onboarding');
      },
      onError: (err) => {
        setError(translateErrorMessage(err.message) || 'Error al registrar la cuenta');
      },
    });
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <VStack spacing={2} textAlign="center">
          <Heading fontSize="2xl" color="blue.500">
            Finanzas Familiares
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Crea tu cuenta y comienza a controlar tus finanzas
          </Text>
        </VStack>

        <Box
          bg={bgColor}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={8}
          w="full"
          boxShadow="lg"
        >
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>Crear Equipo</Tab>
              <Tab>Unirse a Equipo</Tab>
            </TabList>

            <TabPanels>
              {/* Create New Team Tab */}
              <TabPanel p={0} pt={6}>
                <form onSubmit={(e) => handleSubmit(e, true)}>
                  <VStack spacing={6}>
                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}

                    <FormControl isRequired>
                      <FormLabel>Nombre completo</FormLabel>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre completo"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Correo electrónico</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Nombre del equipo/familia</FormLabel>
                      <Input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Familia García, Mi Familia, etc."
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Contraseña</FormLabel>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirma tu contraseña"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      isLoading={registerMutation.isPending}
                      loadingText="Creando cuenta..."
                    >
                      Crear Cuenta y Equipo
                    </Button>
                  </VStack>
                </form>
              </TabPanel>

              {/* Join Existing Team Tab */}
              <TabPanel p={0} pt={6}>
                <form onSubmit={(e) => handleSubmit(e, false)}>
                  <VStack spacing={6}>
                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}

                    <FormControl isRequired>
                      <FormLabel>Nombre completo</FormLabel>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre completo"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Correo electrónico</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Código de invitación</FormLabel>
                      <Input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Código proporcionado por tu familia"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Contraseña</FormLabel>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirma tu contraseña"
                        focusBorderColor="blue.500"
                      />
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      isLoading={registerMutation.isPending}
                      loadingText="Uniéndose al equipo..."
                    >
                      Unirse al Equipo
                    </Button>
                  </VStack>
                </form>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <VStack spacing={2} mt={6}>
            <Text color="gray.600">
              ¿Ya tienes cuenta?{' '}
              <Link color="blue.500" onClick={() => navigate('/login')}>
                Iniciar sesión
              </Link>
            </Text>
          </VStack>
        </Box>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Al registrarte, aceptas nuestros términos de servicio y política de privacidad.
        </Text>
      </VStack>
    </Container>
  );
}