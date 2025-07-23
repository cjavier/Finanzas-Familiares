import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Stack,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { FaChartLine, FaUsers, FaBell, FaMobile } from 'react-icons/fa';

const Feature = ({ title, text, icon }: { title: string; text: string; icon: any }) => {
  return (
    <Stack align={'center'}>
      <Box
        w={16}
        h={16}
        bg={'blue.100'}
        rounded={'full'}
        display={'flex'}
        alignItems={'center'}
        justifyContent={'center'}
        mb={4}
      >
        <Icon as={icon} w={8} h={8} color={'blue.500'} />
      </Box>
      <Text fontWeight={600} fontSize={'lg'}>
        {title}
      </Text>
      <Text color={'gray.600'} textAlign={'center'}>
        {text}
      </Text>
    </Stack>
  );
};

export default function LandingPage() {
  const [, navigate] = useLocation();
  const bgGradient = useColorModeValue(
    'linear(to-r, blue.400, purple.400)',
    'linear(to-r, blue.400, purple.400)'
  );

  return (
    <Box>
      {/* Hero Section */}
      <Box bgGradient={bgGradient} color="white">
        <Container maxW={'7xl'} py={20}>
          <VStack spacing={8} textAlign={'center'}>
            <Heading
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
              lineHeight={'110%'}
            >
              Finanzas Familiares{' '}
              <Text as={'span'} color={'yellow.400'}>
                Inteligentes
              </Text>
            </Heading>
            <Text maxW={'3xl'} fontSize={{ base: 'lg', md: 'xl' }}>
              Controla las finanzas de tu familia con inteligencia artificial. 
              Categoriza automáticamente tus gastos, establece presupuestos y 
              toma decisiones financieras informadas.
            </Text>
            <Stack
              spacing={6}
              direction={{ base: 'column', md: 'row' }}
              w={'full'}
              maxW={'md'}
            >
              <Button
                rounded={'full'}
                px={6}
                colorScheme={'yellow'}
                bg={'yellow.400'}
                color={'black'}
                _hover={{ bg: 'yellow.500' }}
                onClick={() => navigate('/register')}
              >
                Crear Cuenta
              </Button>
              <Button
                rounded={'full'}
                px={6}
                variant={'outline'}
                borderColor={'white'}
                color={'white'}
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => navigate('/login')}
              >
                Iniciar Sesión
              </Button>
            </Stack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box p={4}>
        <Container maxW={'6xl'} mt={10}>
          <VStack spacing={2} textAlign="center">
            <Heading fontSize={'3xl'}>¿Por qué elegir nuestra app?</Heading>
            <Text fontSize={'lg'} color={'gray.500'}>
              Herramientas inteligentes para el control financiero familiar
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={10} mt={10}>
            <Feature
              icon={FaChartLine}
              title={'Análisis Inteligente'}
              text={
                'Categorización automática de transacciones y análisis detallado de patrones de gasto.'
              }
            />
            <Feature
              icon={FaUsers}
              title={'Colaborativo'}
              text={
                'Comparte el control financiero con tu familia. Cada miembro puede participar activamente.'
              }
            />
            <Feature
              icon={FaBell}
              title={'Alertas y Presupuestos'}
              text={
                'Recibe notificaciones cuando te acerques a los límites de tus presupuestos.'
              }
            />
            <Feature
              icon={FaMobile}
              title={'Acceso Total'}
              text={
                'Disponible en todos tus dispositivos. Controla tus finanzas desde cualquier lugar.'
              }
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box bg={'gray.50'} py={16}>
        <Container maxW={'6xl'}>
          <VStack spacing={8}>
            <Heading fontSize={'3xl'} textAlign={'center'}>
              Preguntas Frecuentes
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
              <Box>
                <Text fontWeight={'bold'} mb={2}>
                  ¿Es segura mi información financiera?
                </Text>
                <Text color={'gray.600'}>
                  Sí, utilizamos encriptación de nivel bancario y nunca compartimos 
                  tu información personal con terceros.
                </Text>
              </Box>
              <Box>
                <Text fontWeight={'bold'} mb={2}>
                  ¿Puedo invitar a mi familia?
                </Text>
                <Text color={'gray.600'}>
                  Por supuesto. Puedes crear un equipo familiar e invitar a todos 
                  los miembros para que colaboren en el control financiero.
                </Text>
              </Box>
              <Box>
                <Text fontWeight={'bold'} mb={2}>
                  ¿Cómo funciona la categorización automática?
                </Text>
                <Text color={'gray.600'}>
                  Nuestro sistema de IA aprende de tus transacciones y las categoriza 
                  automáticamente. También puedes crear reglas personalizadas.
                </Text>
              </Box>
              <Box>
                <Text fontWeight={'bold'} mb={2}>
                  ¿Puedo usar la app en mi móvil?
                </Text>
                <Text color={'gray.600'}>
                  Sí, nuestra aplicación web es completamente responsiva y funciona 
                  perfectamente en dispositivos móviles y tablets.
                </Text>
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bgGradient={bgGradient} color="white" py={16}>
        <Container maxW={'6xl'} textAlign={'center'}>
          <VStack spacing={6}>
            <Heading fontSize={{ base: '2xl', md: '4xl' }}>
              ¿Listo para tomar el control de tus finanzas?
            </Heading>
            <Text fontSize={'xl'} maxW={'2xl'}>
              Únete a miles de familias que ya han transformado su relación con el dinero.
            </Text>
            <HStack spacing={4}>
              <Button
                size={'lg'}
                rounded={'full'}
                px={8}
                colorScheme={'yellow'}
                bg={'yellow.400'}
                color={'black'}
                _hover={{ bg: 'yellow.500' }}
                onClick={() => navigate('/register')}
              >
                Comenzar Gratis
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}