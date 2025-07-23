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
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from '@chakra-ui/react';
import Navigation from '@/components/navigation';
import { FaUpload, FaDownload, FaEye, FaTrash, FaEllipsisV, FaFile } from 'react-icons/fa';

const mockFiles = [
  { 
    id: '1', 
    name: 'estado-cuenta-enero.pdf', 
    type: 'PDF', 
    date: '2024-01-15', 
    status: 'procesado', 
    transactions: 25 
  },
  { 
    id: '2', 
    name: 'tickets-compras.xlsx', 
    type: 'Excel', 
    date: '2024-01-10', 
    status: 'procesando', 
    transactions: 0 
  },
  { 
    id: '3', 
    name: 'exportacion-banco.csv', 
    type: 'CSV', 
    date: '2024-01-05', 
    status: 'error', 
    transactions: 0 
  },
];

export default function FilesPage() {
  const cardBg = useColorModeValue('white', 'gray.700');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'procesado': return 'green';
      case 'procesando': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Historial de Archivos</Heading>
              <Text color="gray.600">Gestión de archivos subidos (estados de cuenta, tickets, etc)</Text>
            </VStack>
            
            <Button colorScheme="blue" leftIcon={<FaUpload />}>
              Subir Archivo
            </Button>
          </HStack>

          <VStack spacing={4}>
            {mockFiles.map((file) => (
              <Card key={file.id} bg={cardBg} w="full">
                <CardBody>
                  <HStack justify="space-between" align="center">
                    <HStack spacing={4} flex={1}>
                      <FaFile size={24} color="gray" />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">{file.name}</Text>
                        <HStack spacing={4}>
                          <Text fontSize="sm" color="gray.600">
                            Tipo: {file.type}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            Fecha: {new Date(file.date).toLocaleDateString('es-ES')}
                          </Text>
                          {file.transactions > 0 && (
                            <Text fontSize="sm" color="gray.600">
                              {file.transactions} transacciones generadas
                            </Text>
                          )}
                        </HStack>
                      </VStack>
                    </HStack>
                    
                    <HStack spacing={3}>
                      <Badge colorScheme={getStatusColor(file.status)}>
                        {file.status === 'procesado' ? 'Procesado' :
                         file.status === 'procesando' ? 'Procesando' : 'Error'}
                      </Badge>
                      
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Opciones"
                          icon={<FaEllipsisV />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem icon={<FaEye />}>Ver detalles</MenuItem>
                          <MenuItem icon={<FaDownload />}>Descargar original</MenuItem>
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