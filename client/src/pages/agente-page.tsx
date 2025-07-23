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
import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';
import { FaPaperPlane, FaFile, FaRobot, FaUser } from 'react-icons/fa';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

export default function AgentePage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load conversation history on mount
    loadConversationHistory();
    
    // Add welcome message if no history
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'bot',
        message: '¡Hola! Soy tu asistente de finanzas familiares. Puedo ayudarte a analizar archivos, crear transacciones, categorizar gastos y más. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch('/api/agent/history?limit=20');
      if (response.ok) {
        const history = await response.json();
        const chatMessages: ChatMessage[] = [];
        
        history.forEach((conv: any) => {
          chatMessages.push({
            id: `${conv.id}-user`,
            type: 'user',
            message: conv.message,
            timestamp: new Date(conv.createdAt),
          });
          chatMessages.push({
            id: `${conv.id}-bot`,
            type: 'bot',
            message: conv.response,
            timestamp: new Date(conv.createdAt),
          });
        });
        
        setMessages(chatMessages.reverse());
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const cardBg = useColorModeValue('white', 'gray.700');
  const userMsgBg = useColorModeValue('blue.500', 'blue.600');
  const botMsgBg = useColorModeValue('gray.100', 'gray.600');

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    const currentMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          message: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        const errorResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          message: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        message: 'Lo siento, no pude conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload integration with files page
    window.location.href = '/files';
  };

  const handleQuickAction = async (actionType: string) => {
    let quickMessage = '';
    
    switch (actionType) {
      case 'analyze':
        quickMessage = 'Analiza mis gastos recientes y dame un resumen de mis patrones de gasto';
        break;
      case 'categorize':
        quickMessage = 'Ayúdame a categorizar mis transacciones sin categorizar';
        break;
      case 'rules':
        quickMessage = 'Crea reglas automáticas basadas en mis transacciones recientes';
        break;
      case 'budget':
        quickMessage = 'Revisa mis presupuestos y dime cómo voy con mis gastos este mes';
        break;
      default:
        return;
    }

    setMessage(quickMessage);
    setTimeout(() => handleSendMessage(), 100);
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
                      <Button size="sm" variant="outline" onClick={() => handleQuickAction('analyze')}>
                        📊 Analizar gastos
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickAction('categorize')}>
                        🏷️ Categorizar transacciones
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickAction('rules')}>
                        📋 Crear regla
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickAction('budget')}>
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