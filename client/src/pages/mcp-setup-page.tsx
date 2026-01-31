import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Icon,
  Card,
  CardHeader,
  CardBody,
  OrderedList,
  ListItem,
  UnorderedList,
  useClipboard,
  Button,
  Tooltip,
} from '@chakra-ui/react';
import { FaRobot, FaCopy, FaCheck, FaTerminal, FaPlug, FaKey, FaTools } from 'react-icons/fa';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  const { hasCopied, onCopy } = useClipboard(copyText || children);
  const bgColor = useColorModeValue('gray.800', 'gray.900');

  return (
    <Box position="relative" my={2}>
      <Code
        display="block"
        whiteSpace="pre"
        overflowX="auto"
        p={4}
        borderRadius="md"
        bg={bgColor}
        color="green.300"
        fontSize="sm"
      >
        {children}
      </Code>
      <Tooltip label={hasCopied ? 'Copiado!' : 'Copiar'}>
        <Button
          size="xs"
          position="absolute"
          top={2}
          right={2}
          onClick={onCopy}
          colorScheme={hasCopied ? 'green' : 'gray'}
        >
          <Icon as={hasCopied ? FaCheck : FaCopy} />
        </Button>
      </Tooltip>
    </Box>
  );
}

export default function McpSetupPage() {
  const { user } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const mcpConfig = `{
  "mcpServers": {
    "finanzas-familiares": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "mcp/src/index.ts"],
      "env": {
        "DATABASE_URL": "TU_URL_DE_BASE_DE_DATOS",
        "MCP_USER_EMAIL": "${user?.email || 'tu-email@ejemplo.com'}"
      }
    }
  }
}`;

  const envVarsExample = `export DATABASE_URL="postgresql://usuario:password@host:puerto/basedatos"
export MCP_USER_EMAIL="${user?.email || 'tu-email@ejemplo.com'}"`;

  const claudeAddCommand = `claude mcp add --transport stdio finanzas-familiares \\
  --env DATABASE_URL="$DATABASE_URL" \\
  --env MCP_USER_EMAIL="$MCP_USER_EMAIL" \\
  -- npx tsx mcp/src/index.ts`;

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Navigation />
      <Container maxW="4xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <HStack justify="center" mb={4}>
              <Icon as={FaRobot} boxSize={10} color="purple.500" />
              <Heading size="xl">Conectar Claude Code</Heading>
            </HStack>
            <Text color="gray.600" fontSize="lg">
              Configura tu instancia de Claude Code para gestionar tus finanzas directamente desde la terminal
            </Text>
          </Box>

          {/* Intro Alert */}
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>¿Qué es MCP?</AlertTitle>
              <AlertDescription>
                MCP (Model Context Protocol) permite que Claude Code se conecte a esta aplicación
                y use las mismas herramientas que el Agente interno: crear transacciones,
                ver categorías, gestionar presupuestos y más.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Prerequisites */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaKey} color="orange.500" />
                <Heading size="md">Requisitos Previos</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <UnorderedList spacing={2}>
                <ListItem>
                  <Text><strong>Claude Code instalado</strong> en tu máquina</Text>
                  <Text fontSize="sm" color="gray.500">
                    Instalar con: <Code>brew install --cask claude-code</Code> (macOS) o visita{' '}
                    <Code>claude.ai/code</Code>
                  </Text>
                </ListItem>
                <ListItem>
                  <Text><strong>Cuenta activa</strong> en Finanzas Familiares (ya la tienes)</Text>
                </ListItem>
                <ListItem>
                  <Text><strong>Acceso a la URL de base de datos</strong> del proyecto</Text>
                  <Text fontSize="sm" color="gray.500">
                    Solicítala al administrador del equipo si no la tienes
                  </Text>
                </ListItem>
              </UnorderedList>
            </CardBody>
          </Card>

          {/* Step by Step */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaTerminal} color="green.500" />
                <Heading size="md">Guía Paso a Paso</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowMultiple defaultIndex={[0]}>
                {/* Step 1 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>1</Badge>
                      <Text fontWeight="bold">Configurar Variables de Entorno</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Exporta las variables de entorno necesarias en tu terminal:
                    </Text>
                    <CodeBlock copyText={envVarsExample}>{envVarsExample}</CodeBlock>
                    <Alert status="warning" mt={4} size="sm">
                      <AlertIcon />
                      <Text fontSize="sm">
                        <strong>Tu email:</strong> {user?.email || 'No disponible'} —
                        Usa este email para conectarte con tu cuenta
                      </Text>
                    </Alert>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 2 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>2</Badge>
                      <Text fontWeight="bold">Clonar el Repositorio (si no lo tienes)</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Clona el repositorio del proyecto y navega a la carpeta:
                    </Text>
                    <CodeBlock>{`git clone <URL_DEL_REPOSITORIO>
cd finanzas-familiares`}</CodeBlock>
                    <Text mt={4} fontSize="sm" color="gray.500">
                      Si ya tienes el proyecto, solo asegúrate de estar en la carpeta raíz.
                    </Text>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 3 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>3</Badge>
                      <Text fontWeight="bold">Instalar Dependencias del MCP</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Instala las dependencias del servidor MCP:
                    </Text>
                    <CodeBlock>{`cd mcp
npm install
cd ..`}</CodeBlock>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 4 - Option A */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="green" fontSize="md" px={2}>4A</Badge>
                      <Text fontWeight="bold">Opción A: Usar archivo .mcp.json (Recomendado)</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      El proyecto ya incluye un archivo <Code>.mcp.json</Code> configurado.
                      Solo necesitas tener las variables de entorno exportadas y abrir Claude Code:
                    </Text>
                    <CodeBlock>{`# Con las variables exportadas, abre Claude Code
claude

# Verifica que el MCP esté conectado
/mcp`}</CodeBlock>
                    <Text mt={4} fontSize="sm" color="gray.500">
                      Claude Code detectará automáticamente el archivo .mcp.json y conectará el servidor.
                    </Text>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 4 - Option B */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="purple" fontSize="md" px={2}>4B</Badge>
                      <Text fontWeight="bold">Opción B: Agregar MCP Manualmente</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Si prefieres agregar el MCP manualmente (útil para configuración global):
                    </Text>
                    <CodeBlock copyText={claudeAddCommand}>{claudeAddCommand}</CodeBlock>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 5 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>5</Badge>
                      <Text fontWeight="bold">Verificar Conexión</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Dentro de Claude Code, verifica que el MCP esté conectado:
                    </Text>
                    <CodeBlock>{`/mcp`}</CodeBlock>
                    <Text mt={4}>
                      Deberías ver <Code>finanzas-familiares</Code> en la lista de servidores conectados.
                    </Text>
                    <Alert status="success" mt={4}>
                      <AlertIcon />
                      <Text>
                        ¡Listo! Ahora puedes pedirle a Claude que gestione tus finanzas.
                      </Text>
                    </Alert>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Available Tools */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaTools} color="blue.500" />
                <Heading size="md">Herramientas Disponibles</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text mb={4}>
                Una vez conectado, Claude Code tendrá acceso a estas herramientas:
              </Text>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Herramienta</Th>
                    <Th>Descripción</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td><Code>obtener_transacciones</Code></Td>
                    <Td>Listar transacciones con filtros por fecha, categoría, banco</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>crear_transacciones</Code></Td>
                    <Td>Crear una o múltiples transacciones</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>actualizar_transaccion</Code></Td>
                    <Td>Modificar una transacción existente</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>eliminar_transaccion</Code></Td>
                    <Td>Eliminar una transacción</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>obtener_categorias</Code></Td>
                    <Td>Ver todas las categorías del equipo</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>gestionar_categoria</Code></Td>
                    <Td>Crear o editar categorías</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>obtener_reglas</Code></Td>
                    <Td>Ver reglas de categorización automática</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>gestionar_regla</Code></Td>
                    <Td>Crear o editar reglas</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>obtener_presupuestos</Code></Td>
                    <Td>Ver presupuestos con gastos actuales</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>gestionar_presupuesto</Code></Td>
                    <Td>Crear o editar presupuestos</Td>
                  </Tr>
                  <Tr>
                    <Td><Code>obtener_contexto</Code></Td>
                    <Td>Ver información del usuario, equipo y bancos</Td>
                  </Tr>
                </Tbody>
              </Table>
            </CardBody>
          </Card>

          {/* Example Usage */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaPlug} color="purple.500" />
                <Heading size="md">Ejemplos de Uso</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="bold" mb={2}>Registrar gastos del día:</Text>
                  <CodeBlock>{`"Registra estas transacciones:
- Uber $150 hoy
- Comida en restaurante $450
- Netflix $199"`}</CodeBlock>
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Consultar gastos:</Text>
                  <CodeBlock>{`"¿Cuánto gasté en comida este mes?"`}</CodeBlock>
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Crear una regla:</Text>
                  <CodeBlock>{`"Crea una regla para que todas las transacciones
que contengan 'Uber' se categoricen como Transporte"`}</CodeBlock>
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Ver estado de presupuestos:</Text>
                  <CodeBlock>{`"¿Cómo voy con mis presupuestos?"`}</CodeBlock>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Troubleshooting */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <Heading size="md">Solución de Problemas</Heading>
            </CardHeader>
            <CardBody>
              <Accordion allowMultiple>
                <AccordionItem>
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontWeight="medium">
                      El MCP no aparece en /mcp
                    </Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <UnorderedList>
                      <ListItem>Verifica que las variables de entorno estén exportadas</ListItem>
                      <ListItem>Reinicia Claude Code completamente</ListItem>
                      <ListItem>Asegúrate de estar en la carpeta raíz del proyecto</ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontWeight="medium">
                      Error de conexión a base de datos
                    </Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <UnorderedList>
                      <ListItem>Verifica que DATABASE_URL sea correcta</ListItem>
                      <ListItem>Asegúrate de que la base de datos esté accesible</ListItem>
                      <ListItem>Revisa que no haya restricciones de IP</ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontWeight="medium">
                      Usuario no encontrado
                    </Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <UnorderedList>
                      <ListItem>Verifica que MCP_USER_EMAIL coincida con tu email registrado</ListItem>
                      <ListItem>El email es sensible a mayúsculas/minúsculas</ListItem>
                      <ListItem>Tu email actual: <Code>{user?.email}</Code></ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
