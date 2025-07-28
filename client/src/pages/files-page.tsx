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
  Progress,
  Alert,
  AlertIcon,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Input,
  Center,
  Divider,
} from '@chakra-ui/react';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { File as DbFile } from '@shared/schema';
import { FaUpload, FaDownload, FaEye, FaTrash, FaEllipsisV, FaFile, FaCloudUploadAlt } from 'react-icons/fa';

export default function FilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Fetch files
  const { data: files = [], isLoading: isLoadingFiles } = useQuery<DbFile[]>({
    queryKey: ['/api/files'],
    enabled: !!user,
  });

  // Create chat session and redirect
  const createChatSessionAndRedirect = async (uploadedFile: any) => {
    try {
      // Create new chat session
      const sessionResponse = await fetch('/api/agent/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: `Análisis de ${uploadedFile.filename}`
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create chat session');
      }

      const session = await sessionResponse.json();

      // Send file to agent for analysis
      const formData = new FormData();
      
      // Get the file blob from the uploaded file info
      // Since we don't have the original File object here, we'll use a different approach
      // We'll use the file ID to reference the uploaded file
      const analysisResponse = await fetch('/api/agent/analyze-and-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileId: uploadedFile.id,
          sessionId: session.id,
          message: 'Analiza este archivo y realiza las acciones necesarias'
        }),
      });

      if (!analysisResponse.ok) {
        console.error('Failed to send analysis request to agent');
      }

      // Redirect to agent page with session parameter
      window.location.href = `/agente?sessionId=${session.id}`;
      
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast({
        title: "Archivo subido",
        description: "El archivo se procesó correctamente, pero hubo un problema al crear la sesión de chat automática. Puedes subir el archivo manualmente en el agente.",
      });
    }
  };

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (fileToUpload: File) => {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
      }
      
      return await res.json();
    },
    onSuccess: async (uploadedFile) => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      onClose();
      setUploadProgress({});
      
      // Create chat session and redirect to agent
      await createChatSessionAndRedirect(uploadedFile);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress({});
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Archivo eliminado",
        description: "El archivo y sus transacciones asociadas han sido eliminados.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((selectedFile) => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Tipo de archivo no válido",
          description: "Solo se permiten archivos PDF, Excel (.xlsx, .xls) y CSV.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no puede ser mayor a 10MB.",
          variant: "destructive",
        });
        return;
      }

      uploadFileMutation.mutate(selectedFile);
    });
  }, [uploadFileMutation, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'yellow';
      case 'error': return 'red';
      case 'uploaded': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'processing': return 'Procesando';
      case 'error': return 'Error';
      case 'uploaded': return 'Subido';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('csv')) return '📋';
    return '📁';
  };

  if (isLoadingFiles) {
    return (
      <Box>
        <Navigation />
        <Container maxW="6xl" py={8}>
          <VStack spacing={6}>
            <Spinner size="xl" />
            <Text>Cargando archivos...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

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
            
            <Button colorScheme="blue" leftIcon={<FaUpload />} onClick={onOpen}>
              Subir Archivo
            </Button>
          </HStack>

          {/* Help Alert */}
          <Alert status="info" variant="left-accent">
            <AlertIcon />
            <AlertDescription>
              <Text fontWeight="medium">💡 Tipos de archivo soportados</Text>
              <Text fontSize="sm" mt={1}>
                Puedes subir archivos PDF (estados de cuenta), Excel (.xlsx, .xls) y CSV con transacciones. 
                Los archivos se procesan automáticamente para extraer las transacciones.
              </Text>
            </AlertDescription>
          </Alert>

          {/* Files List */}
          {files.length === 0 ? (
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <FaCloudUploadAlt size={48} color="gray" />
                  <Text fontSize="lg" color="gray.500">
                    No has subido archivos aún
                  </Text>
                  <Text fontSize="sm" color="gray.400" textAlign="center">
                    Sube tus estados de cuenta, archivos Excel o CSV para extraer transacciones automáticamente.
                  </Text>
                  <Button
                    leftIcon={<FaUpload />}
                    colorScheme="blue"
                    onClick={onOpen}
                  >
                    Subir primer archivo
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <VStack spacing={4}>
              {files.map((file) => (
                <Card key={file.id} bg={cardBg} w="full">
                  <CardBody>
                    <HStack justify="space-between" align="start">
                      <HStack spacing={4} flex={1}>
                        <Text fontSize="2xl">{getFileIcon(file.mimetype)}</Text>
                        <VStack align="start" spacing={2}>
                          <Text fontWeight="bold">{file.filename}</Text>
                          <HStack spacing={4} flexWrap="wrap">
                            <Text fontSize="sm" color="gray.600">
                              Tamaño: {formatFileSize(parseInt(file.size))}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Subido: {new Date(file.createdAt).toLocaleDateString('es-ES')}
                            </Text>
                            {file.transactionCount && parseInt(file.transactionCount) > 0 && (
                              <Text fontSize="sm" color="green.600" fontWeight="medium">
                                {file.transactionCount} transacciones extraídas
                              </Text>
                            )}
                            {file.processedAt && (
                              <Text fontSize="sm" color="gray.600">
                                Procesado: {new Date(file.processedAt).toLocaleDateString('es-ES')}
                              </Text>
                            )}
                          </HStack>
                          {file.errorMessage && (
                            <Text fontSize="sm" color="red.500" fontWeight="medium">
                              Error: {file.errorMessage}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      
                      <HStack spacing={3}>
                        <Badge colorScheme={getStatusColor(file.status)} size="sm">
                          {getStatusLabel(file.status)}
                        </Badge>
                        
                        {file.status === 'processing' && <Spinner size="sm" />}
                        
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Opciones"
                            icon={<FaEllipsisV />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem 
                              icon={<FaEye />}
                              onClick={() => {
                                // Navigate to transactions filtered by this file
                                // This would need fileId support in transactions
                                window.location.href = '/transactions';
                              }}
                            >
                              Ver transacciones
                            </MenuItem>
                            <MenuItem 
                              icon={<FaTrash />} 
                              color="red.500"
                              onClick={() => deleteFileMutation.mutate(file.id)}
                              isDisabled={deleteFileMutation.isPending}
                            >
                              Eliminar
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Subir Archivo</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              {/* Drag and Drop Area */}
              <Box
                border="2px dashed"
                borderColor={isDragOver ? "blue.300" : "gray.300"}
                borderRadius="lg"
                p={8}
                textAlign="center"
                bg={isDragOver ? "blue.50" : "gray.50"}
                transition="all 0.2s"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                cursor="pointer"
                onClick={() => fileInputRef.current?.click()}
                w="full"
              >
                <VStack spacing={3}>
                  <FaCloudUploadAlt size={40} color={isDragOver ? "blue" : "gray"} />
                  <Text fontWeight="bold" color={isDragOver ? "blue.600" : "gray.600"}>
                    {isDragOver ? "Suelta el archivo aquí" : "Arrastra un archivo aquí o haz clic para seleccionar"}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    PDF, Excel (.xlsx, .xls) o CSV - Máximo 10MB
                  </Text>
                </VStack>
              </Box>

              <Divider />

              <Text fontSize="sm" color="gray.600" textAlign="center">
                O selecciona un archivo manualmente:
              </Text>

              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
                multiple
              />

              <Button
                leftIcon={<FaUpload />}
                colorScheme="blue"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                w="full"
              >
                Seleccionar Archivo(s)
              </Button>

              {uploadFileMutation.isPending && (
                <VStack spacing={2} w="full">
                  <Text fontSize="sm" color="gray.600">Subiendo archivo...</Text>
                  <Progress size="sm" isIndeterminate w="full" />
                </VStack>
              )}

              {/* Usage Tips */}
              <Alert status="info" size="sm">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  <Text fontWeight="medium">💡 Consejos para mejores resultados:</Text>
                  <VStack align="start" spacing={1} mt={2} fontSize="xs">
                    <Text>• Para CSV: incluye columnas como "fecha", "descripcion", "monto"</Text>
                    <Text>• Para Excel: asegúrate que los datos estén en la primera hoja</Text>
                    <Text>• Para PDF: funciona mejor con estados de cuenta estructurados</Text>
                  </VStack>
                </AlertDescription>
              </Alert>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}