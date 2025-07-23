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
  useColorModeValue,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { translateErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { loginMutation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Email y contraseña son requeridos');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de email inválido');
      return;
    }

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          // Login successful - redirect to dashboard
          navigate('/dashboard');
        },
        onError: (err) => {
          setError(translateErrorMessage(err.message) || 'Error al iniciar sesión');
        },
      }
    );
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <VStack spacing={2} textAlign="center">
          <Heading fontSize="2xl" color="blue.500">
            Finanzas Familiares
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Inicia sesión en tu cuenta
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
          <form onSubmit={handleSubmit}>
            <VStack spacing={6}>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

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
                <FormLabel>Contraseña</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  focusBorderColor="blue.500"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                w="full"
                isLoading={loginMutation.isPending}
                loadingText="Iniciando sesión..."
              >
                Iniciar Sesión
              </Button>

              <VStack spacing={2}>
                <Link
                  color="blue.500"
                  onClick={() => {
                    // TODO: Implement forgot password
                    alert('Funcionalidad de recuperar contraseña no implementada aún');
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
                
                <Text color="gray.600">
                  ¿No tienes cuenta?{' '}
                  <Link color="blue.500" onClick={() => navigate('/register')}>
                    Crear cuenta
                  </Link>
                </Text>
              </VStack>
            </VStack>
          </form>
        </Box>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad.
        </Text>
      </VStack>
    </Container>
  );
}