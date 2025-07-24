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
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';
import { FaPaperPlane, FaFile, FaRobot, FaUser, FaPlus, FaEllipsisV, FaEdit, FaTrash, FaComments } from 'react-icons/fa';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
  toolsUsed?: string[];
}

interface Conversation {
  id: string;
  sessionId: string;
  message: string;
  response: string;
  createdAt: string;
  context?: {
    toolsUsed?: string[];
    [key: string]: any;
  };
}

const getToolDisplayName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    'obtener_transacciones': 'Consultar transacciones',
    'obtener_categorias': 'Ver categorías',
    'gestionar_categoria': 'Gestionar categoría',
    'obtener_reglas': 'Ver reglas',
    'gestionar_regla': 'Gestionar regla',
    'obtener_presupuestos': 'Ver presupuestos',
    'gestionar_presupuesto': 'Gestionar presupuesto'
  };
  return toolNames[toolName] || toolName;
};

export default function AgentePage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadChatSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadConversationHistory(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const loadChatSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch('/api/agent/sessions');
      if (response.ok) {
        const sessions = await response.json();
        setChatSessions(sessions);
        
        // If no current session and sessions exist, select the first one
        if (!currentSessionId && sessions.length > 0) {
          setCurrentSessionId(sessions[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las sesiones de chat',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadConversationHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}/conversations?limit=50`);
      if (response.ok) {
        const conversations: Conversation[] = await response.json();
        const chatMessages: ChatMessage[] = [];
        
        conversations.reverse().forEach((conv) => {
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
            toolsUsed: conv.context?.toolsUsed || []
          });
        });
        
        setMessages(chatMessages);
        
        // Add welcome message if no history
        if (chatMessages.length === 0) {
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            type: 'bot',
            message: '¡Hola! Soy tu asistente de finanzas familiares. Puedo ayudarte a analizar archivos, crear transacciones, categorizar gastos y más. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const createNewSession = async () => {
    if (!newSessionTitle.trim()) {
      toast({
        title: 'Error',
        description: 'El título de la sesión es obligatorio',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/agent/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newSessionTitle.trim() }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setNewSessionTitle('');
        onClose();
        
        toast({
          title: 'Éxito',
          description: 'Nueva sesión de chat creada',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating new session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la nueva sesión',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (response.ok) {
        setChatSessions(prev => 
          prev.map(session => 
            session.id === sessionId 
              ? { ...session, title: newTitle.trim() }
              : session
          )
        );
        setEditingSessionId(null);
        setEditingTitle('');
        
        toast({
          title: 'Éxito',
          description: 'Título de sesión actualizado',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el título',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        
        if (currentSessionId === sessionId) {
          const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
          setCurrentSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        }
        
        toast({
          title: 'Éxito',
          description: 'Sesión eliminada',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la sesión',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const cardBg = useColorModeValue('white', 'gray.700');
  const userMsgBg = useColorModeValue('blue.500', 'blue.600');
  const botMsgBg = useColorModeValue('gray.100', 'gray.600');

  const handleSendMessage = async () => {
    if (!message.trim() || !currentSessionId) return;

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
        body: JSON.stringify({ 
          message: currentMessage,
          sessionId: currentSessionId 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          message: data.response,
          timestamp: new Date(),
          toolsUsed: data.toolsUsed || []
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

  const currentSession = chatSessions.find(s => s.id === currentSessionId);

  return (
    <Box>
      <Navigation />
      
      <Container maxW="8xl" py={8} h="calc(100vh - 120px)">
        <Flex h="full" gap={0}>
          {/* Chat Sessions Sidebar */}
          <Box w="300px" mr={6}>
            <VStack spacing={4} align="stretch">
              {/* Header with New Chat Button */}
              <HStack justify="space-between">
                <Heading size="md" color="purple.500">Chats</Heading>
                <Button 
                  size="sm" 
                  colorScheme="purple" 
                  leftIcon={<FaPlus />}
                  onClick={onOpen}
                >
                  Nuevo
                </Button>
              </HStack>

              {/* Chat Sessions List */}
              <Card flex={1} maxH="calc(100vh - 200px)">
                <CardBody p={2}>
                  {isLoadingSessions ? (
                    <Flex justify="center" align="center" h="100px">
                      <Spinner size="md" color="purple.500" />
                    </Flex>
                  ) : chatSessions.length === 0 ? (
                    <VStack spacing={4} align="center" py={8}>
                      <FaComments size={40} color="gray" />
                      <Text color="gray.500" textAlign="center">
                        No hay sesiones de chat.
                        <br />
                        Crea una nueva para empezar.
                      </Text>
                    </VStack>
                  ) : (
                    <VStack spacing={2} align="stretch">
                      {chatSessions.map((session) => (
                        <Card
                          key={session.id}
                          variant={currentSessionId === session.id ? 'elevated' : 'outline'}
                          bg={currentSessionId === session.id ? 'purple.50' : 'transparent'}
                          cursor="pointer"
                          onClick={() => setCurrentSessionId(session.id)}
                          _hover={{ bg: 'gray.50' }}
                        >
                          <CardBody p={3}>
                            <HStack justify="space-between" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                {editingSessionId === session.id ? (
                                  <Input
                                    size="sm"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => {
                                      if (editingTitle.trim()) {
                                        updateSessionTitle(session.id, editingTitle);
                                      } else {
                                        setEditingSessionId(null);
                                        setEditingTitle('');
                                      }
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        if (editingTitle.trim()) {
                                          updateSessionTitle(session.id, editingTitle);
                                        } else {
                                          setEditingSessionId(null);
                                          setEditingTitle('');
                                        }
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                                    {session.title}
                                  </Text>
                                )}
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(session.updatedAt).toLocaleDateString('es-ES')}
                                </Text>
                              </VStack>
                              
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<FaEllipsisV />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <MenuList fontSize="sm">
                                  <MenuItem 
                                    icon={<FaEdit />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingTitle(session.title);
                                    }}
                                  >
                                    Editar título
                                  </MenuItem>
                                  <MenuItem 
                                    icon={<FaTrash />}
                                    color="red.500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSession(session.id);
                                    }}
                                  >
                                    Eliminar
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                            
                            {currentSessionId === session.id && (
                              <Badge colorScheme="purple" size="sm" mt={2}>
                                Activo
                              </Badge>
                            )}
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          </Box>

          {/* Chat Area */}
          <VStack spacing={4} flex={1}>
            {/* Current Session Header */}
            {currentSession && (
              <HStack w="full" justify="space-between" align="center">
                <VStack align="start" spacing={0}>
                  <Heading size="lg" color="purple.500">{currentSession.title}</Heading>
                  <Text color="gray.600" fontSize="sm">
                    Actualizado: {new Date(currentSession.updatedAt).toLocaleString('es-ES')}
                  </Text>
                </VStack>
              </HStack>
            )}

            {!currentSession ? (
              <Card flex={1} w="full">
                <CardBody>
                  <VStack spacing={6} align="center" justify="center" h="400px">
                    <FaComments size={80} color="gray" />
                    <VStack spacing={2}>
                      <Heading size="md" color="gray.500">
                        Selecciona una sesión de chat
                      </Heading>
                      <Text color="gray.500" textAlign="center">
                        Elige una sesión existente o crea una nueva para comenzar a chatear con el agente de IA.
                      </Text>
                    </VStack>
                    <Button 
                      colorScheme="purple" 
                      leftIcon={<FaPlus />}
                      onClick={onOpen}
                    >
                      Crear nueva sesión
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              /* Chat Container */
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
                            
                            <VStack align={msg.type === 'user' ? 'flex-end' : 'flex-start'} spacing={1}>
                              {/* Tool usage indicator */}
                              {msg.type === 'bot' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                <HStack spacing={1} fontSize="xs">
                                  {msg.toolsUsed.map((tool, index) => (
                                    <Badge key={index} size="sm" variant="subtle" colorScheme="purple">
                                      🔧 {getToolDisplayName(tool)}
                                    </Badge>
                                  ))}
                                </HStack>
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
                            </VStack>

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
                            isDisabled={!currentSessionId}
                          />
                          <IconButton
                            aria-label="Enviar mensaje"
                            icon={<FaPaperPlane />}
                            colorScheme="purple"
                            onClick={handleSendMessage}
                            isDisabled={!message.trim() || isLoading || !currentSessionId}
                          />
                        </HStack>
                      </VStack>
                    </Box>
                  </Flex>
                </CardBody>
              </Card>
            )}

            {/* Helper Text */}
            <Text fontSize="sm" color="gray.500" textAlign="center">
              El agente puede analizar archivos, extraer transacciones, crear reglas automáticas, 
              consultar datos y ayudarte con la gestión financiera de tu familia.
            </Text>
          </VStack>
        </Flex>
      </Container>

      {/* New Session Modal */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">
            Crear nueva sesión de chat
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch" pt={4}>
              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="medium">Título de la sesión</Text>
                <Input
                  placeholder="Ej: Análisis de gastos enero 2024"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createNewSession();
                    }
                  }}
                />
                <Text fontSize="xs" color="gray.500">
                  Dale un nombre descriptivo a tu nueva sesión de chat
                </Text>
              </VStack>
              
              <HStack spacing={3}>
                <Button
                  colorScheme="purple"
                  onClick={createNewSession}
                  isDisabled={!newSessionTitle.trim()}
                  flex={1}
                >
                  Crear sesión
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
              </HStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}