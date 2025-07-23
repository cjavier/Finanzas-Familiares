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
  Switch,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from '@chakra-ui/react';
import Navigation from '@/components/navigation';
import { FaPlus, FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';

const mockRules = [
  { id: '1', field: 'description', text: 'Soriana', category: 'Alimentación', isActive: true },
  { id: '2', field: 'description', text: 'Shell', category: 'Transporte', isActive: true },
  { id: '3', field: 'description', text: 'Amazon', category: 'Compras', isActive: false },
  { id: '4', field: 'description', text: 'Netflix', category: 'Entretenimiento', isActive: true },
];

export default function RulesPage() {
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Box>
      <Navigation />
      
      <Container maxW="4xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Reglas Automáticas</Heading>
              <Text color="gray.600">Gestión de reglas para clasificación automática de transacciones</Text>
            </VStack>
            
            <Button colorScheme="blue" leftIcon={<FaPlus />}>
              Nueva Regla
            </Button>
          </HStack>

          <VStack spacing={4}>
            {mockRules.map((rule) => (
              <Card key={rule.id} bg={cardBg} w="full">
                <CardBody>
                  <HStack justify="space-between" align="center">
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack spacing={3}>
                        <Text fontWeight="bold">
                          Si "{rule.field}" contiene "{rule.text}"
                        </Text>
                        <Text>→</Text>
                        <Badge colorScheme="blue">
                          {rule.category}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Campo: {rule.field} | Texto: {rule.text}
                      </Text>
                    </VStack>
                    
                    <HStack spacing={3}>
                      <Switch isChecked={rule.isActive} />
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Opciones"
                          icon={<FaEllipsisV />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem icon={<FaEdit />}>Editar</MenuItem>
                          <MenuItem icon={<FaTrash />} color="red.500">Eliminar</MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
}