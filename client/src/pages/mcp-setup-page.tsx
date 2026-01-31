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
  UnorderedList,
  ListItem,
  useClipboard,
  Button,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FaRobot, FaCopy, FaCheck, FaTerminal, FaPlug, FaKey, FaTools, FaCloud, FaLaptop } from 'react-icons/fa';
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

  // Get the current app URL for remote connection
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-app.railway.app';

  const remoteConfig = `{
  "mcpServers": {
    "finanzas-familiares": {
      "type": "http",
      "url": "${appUrl}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${user?.email || 'tu-email@ejemplo.com'}"
      }
    }
  }
}`;

  const claudeAddRemoteCommand = `claude mcp add --transport http finanzas-familiares \\
  --header "Authorization: Bearer ${user?.email || 'tu-email@ejemplo.com'}" \\
  ${appUrl}/api/mcp`;

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

          {/* Quick Setup - Remote (Recommended) */}
          <Alert status="success" borderRadius="md">
            <AlertIcon as={FaCloud} />
            <Box flex="1">
              <AlertTitle>Conexión Remota (Recomendado)</AlertTitle>
              <AlertDescription>
                No necesitas clonar código ni instalar dependencias. Solo configura Claude Code
                para conectarse directamente a esta aplicación.
              </AlertDescription>
            </Box>
            <Badge colorScheme="green" fontSize="sm">Sin código local</Badge>
          </Alert>

          {/* Prerequisites */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaKey} color="orange.500" />
                <Heading size="md">Requisitos</Heading>
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
                  <Text><strong>Cuenta activa</strong> en Finanzas Familiares</Text>
                  <Text fontSize="sm" color="gray.500">
                    Tu email: <Code>{user?.email || 'No disponible'}</Code>
                  </Text>
                </ListItem>
              </UnorderedList>
            </CardBody>
          </Card>

          {/* Step by Step - Remote Setup */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaTerminal} color="green.500" />
                <Heading size="md">Configuración Rápida (2 pasos)</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowMultiple defaultIndex={[0, 1]}>
                {/* Step 1 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>1</Badge>
                      <Text fontWeight="bold">Agregar el servidor MCP a Claude Code</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Ejecuta este comando en tu terminal:
                    </Text>
                    <CodeBlock copyText={claudeAddRemoteCommand}>{claudeAddRemoteCommand}</CodeBlock>
                    <Alert status="info" mt={4} size="sm">
                      <AlertIcon />
                      <Text fontSize="sm">
                        Este comando configura Claude Code para conectarse a esta aplicación
                        usando tu email como autenticación.
                      </Text>
                    </Alert>
                  </AccordionPanel>
                </AccordionItem>

                {/* Step 2 */}
                <AccordionItem border="none">
                  <AccordionButton py={4}>
                    <HStack flex="1">
                      <Badge colorScheme="blue" fontSize="md" px={2}>2</Badge>
                      <Text fontWeight="bold">Verificar la conexión</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Text mb={4}>
                      Abre Claude Code y verifica que el MCP esté conectado:
                    </Text>
                    <CodeBlock>{`claude
/mcp`}</CodeBlock>
                    <Text mt={4}>
                      Deberías ver <Code>finanzas-familiares</Code> en la lista de servidores conectados.
                    </Text>
                    <Alert status="success" mt={4}>
                      <AlertIcon />
                      <Text>
                        ¡Listo! Ya puedes pedirle a Claude que gestione tus finanzas.
                      </Text>
                    </Alert>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Alternative: Manual JSON Config */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack>
                <Icon as={FaPlug} color="purple.500" />
                <Heading size="md">Alternativa: Configuración Manual</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text mb={4}>
                Si prefieres, puedes crear un archivo <Code>.mcp.json</Code> en cualquier carpeta
                donde uses Claude Code:
              </Text>
              <CodeBlock copyText={remoteConfig}>{remoteConfig}</CodeBlock>
              <Text mt={4} fontSize="sm" color="gray.500">
                Claude Code detectará automáticamente este archivo y conectará el servidor.
              </Text>
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
              <Heading size="md">Ejemplos de Uso</Heading>
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
                      <ListItem>Reinicia Claude Code completamente</ListItem>
                      <ListItem>Verifica que el comando se ejecutó sin errores</ListItem>
                      <ListItem>Prueba ejecutar <Code>claude mcp list</Code> para ver servidores configurados</ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontWeight="medium">
                      Error de autenticación (401)
                    </Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <UnorderedList>
                      <ListItem>Verifica que el email en el header sea exactamente: <Code>{user?.email}</Code></ListItem>
                      <ListItem>El email es sensible a mayúsculas/minúsculas</ListItem>
                      <ListItem>Asegúrate de que tu cuenta esté activa</ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontWeight="medium">
                      Error de conexión
                    </Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <UnorderedList>
                      <ListItem>Verifica que la URL de la aplicación sea correcta</ListItem>
                      <ListItem>URL actual: <Code>{appUrl}</Code></ListItem>
                      <ListItem>Asegúrate de tener conexión a internet</ListItem>
                    </UnorderedList>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* API Endpoint Info */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <Heading size="md">Información Técnica</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={2}>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Endpoint:</Text>
                  <Code>{appUrl}/api/mcp</Code>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Protocolo:</Text>
                  <Code>JSON-RPC 2.0</Code>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Autenticación:</Text>
                  <Code>Bearer {user?.email || '<tu-email>'}</Code>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Tu email:</Text>
                  <Code>{user?.email || 'No disponible'}</Code>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
