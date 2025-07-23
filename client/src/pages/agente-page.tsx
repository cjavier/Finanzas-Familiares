import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  Card,
  CardBody,
  Avatar,
  useColorModeValue,
  Flex,
  IconButton,
  Divider,
} from '@chakra-ui/react';
import { useState } from 'react';
import Navigation from '@/components/navigation';
import { FaPaperPlane, FaFile, FaRobot, FaUser } from 'react-icons/fa';

const mockMessages = [
  {
    id: '1',
    type: 'bot',
    message: '¡Hola! Soy tu asistente de finanzas familiares. Puedo ayudarte a analizar archivos, crear transacciones, categorizar gastos y más. ¿En qué puedo ayudarte hoy?',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: '2',
    type: 'user',
    message: 'Hola, quiero subir mi estado de cuenta del banco para que lo analices',
    timestamp: new Date(Date.now() - 45000),
  },
  {
    id: '3',
    type: 'bot',
    message: 'Perfecto, puedes subir tu archivo aquí. Acepto archivos PDF, Excel, CSV e imágenes. Una vez que lo subas, lo analizaré y extraeré todas las transacciones automáticamente.',
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: '4',
    type: 'user',
    message: 'También me gustaría que me ayudes a categorizar algunas transacciones que no estoy seguro cómo clasificar',
    timestamp: new Date(Date.now() - 15000),
  },
  {
    id: '5',
    type: 'bot',
    message: 'Claro, puedo ayudarte con eso. Puedo revisar tus transacciones sin categorizar y sugerir las categorías más apropiadas basándome en la descripción y el monto. ¿Quieres que busque las transacciones pendientes de clasificar?',
    timestamp: new Date(Date.now() - 5000),
  },
];

export default function AgentePage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.700');
  const userMsgBg = useColorModeValue('blue.500', 'blue.600');
  const botMsgBg = useColorModeValue('gray.100', 'gray.600');

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newUserMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setMessage('');
    setIsLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        message: 'Entiendo tu solicitud. Déjame procesar esa información y te ayudo con lo que necesitas.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload
    console.log('File upload clicked');
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="6xl" py={8} h="calc(100vh - 120px)">
        <VStack spacing={6} h="full">
          {/* Header */}
          <VStack align="start" spacing={1} w="full">
            <Heading size="lg" color="purple.500">Agente de IA Interactivo</Heading>
            <Text color="gray.600">
              Interfaz central de chat con agente de inteligencia artificial
            </Text>
          </VStack>

          {/* Chat Container */}
          <Card bg={cardBg} flex={1} w="full">
            <CardBody h="full" p={0}>
              <Flex direction="column" h="full">
                {/* Messages Area */}
                <Box flex={1} overflowY="auto" p={4}>
                  <VStack spacing={4} align="stretch">
                    {messages.map((msg) => (
                      <HStack
                        key={msg.id}
                        align="start"
                        justify={msg.type === 'user' ? 'flex-end' : 'flex-start'}
                        spacing={3}
                      >
                        {msg.type === 'bot' && (
                          <Avatar size="sm" bg="purple.500" icon={<FaRobot />} />
                        )}
                        
                        <Box
                          maxW="70%"
                          bg={msg.type === 'user' ? userMsgBg : botMsgBg}
                          color={msg.type === 'user' ? 'white' : 'inherit'}
                          px={4}
                          py={3}
                          borderRadius="lg"
                          borderBottomLeftRadius={msg.type === 'bot' ? 'sm' : 'lg'}
                          borderBottomRightRadius={msg.type === 'user' ? 'sm' : 'lg'}
                        >
                          <Text>{msg.message}</Text>
                          <Text
                            fontSize="xs"
                            color={msg.type === 'user' ? 'whiteAlpha.700' : 'gray.500'}
                            mt={1}
                          >
                            {msg.timestamp.toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </Box>

                        {msg.type === 'user' && (
                          <Avatar size="sm" bg="blue.500" icon={<FaUser />} />
                        )}
                      </HStack>
                    ))}

                    {isLoading && (
                      <HStack align="start" spacing={3}>
                        <Avatar size="sm" bg="purple.500" icon={<FaRobot />} />
                        <Box
                          bg={botMsgBg}
                          px={4}
                          py={3}
                          borderRadius="lg"
                          borderBottomLeftRadius="sm"
                        >
                          <Text>Escribiendo...</Text>
                        </Box>
                      </HStack>
                    )}
                  </VStack>
                </Box>

                <Divider />

                {/* Input Area */}
                <Box p={4}>
                  <VStack spacing={3}>
                    {/* Quick Actions */}
                    <HStack spacing={2} w="full" overflowX="auto">
                      <Button size="sm" variant="outline" onClick={handleFileUpload}>
                        📎 Subir archivo
                      </Button>
                      <Button size="sm" variant="outline">
                        📊 Analizar gastos
                      </Button>
                      <Button size="sm" variant="outline">
                        🏷️ Categorizar transacciones
                      </Button>
                      <Button size="sm" variant="outline">
                        📋 Crear regla
                      </Button>
                      <Button size="sm" variant="outline">
                        💰 Revisar presupuestos
                      </Button>
                    </HStack>

                    {/* Message Input */}
                    <HStack spacing={2} w="full">
                      <IconButton
                        aria-label="Subir archivo"
                        icon={<FaFile />}
                        variant="outline"
                        onClick={handleFileUpload}
                      />
                      <Input
                        placeholder="Escribe tu mensaje aquí... (Presiona Enter para enviar)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        flex={1}
                      />
                      <IconButton
                        aria-label="Enviar mensaje"
                        icon={<FaPaperPlane />}
                        colorScheme="purple"
                        onClick={handleSendMessage}
                        isDisabled={!message.trim() || isLoading}
                      />
                    </HStack>
                  </VStack>
                </Box>
              </Flex>
            </CardBody>
          </Card>

          {/* Helper Text */}
          <Text fontSize="sm" color="gray.500" textAlign="center">
            El agente puede analizar archivos, extraer transacciones, crear reglas automáticas, 
            consultar datos y ayudarte con la gestión financiera de tu familia.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}