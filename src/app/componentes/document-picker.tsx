"use client"

import { useState } from "react"
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  Box,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper
} from '@mui/material'
import { 
  TableChart as FileSpreadsheetIcon,
  Slideshow as PresentationIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Link as LinkIcon,
  Edit as EditIcon
} from '@mui/icons-material'

interface Document {
  id: string
  name: string
  iconUrl: string
  lastModified: string
}

interface DocumentPickerProps {
  type: "sheets" | "slides"
  onSelect: (doc: Document) => void
  selectedDoc?: Document
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const documents: Document[] = [
  {
    id: "1",
    name: "Precios Q1 2024",
    iconUrl: "/sheets-icon.png",
    lastModified: "2024-03-20"
  },
  {
    id: "2",
    name: "Catálogo de Productos",
    iconUrl: "/sheets-icon.png",
    lastModified: "2024-03-19"
  },
  {
    id: "3",
    name: "Inventario Actualizado",
    iconUrl: "/sheets-icon.png",
    lastModified: "2024-03-18"
  }
];

export function DocumentPicker({ type, onSelect, selectedDoc }: DocumentPickerProps) {
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState("")
  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  const icon = type === "sheets" ? 
    <FileSpreadsheetIcon color="success" /> : 
    <PresentationIcon sx={{ color: 'purple' }} />

  const title = type === "sheets" ? "Google Sheets" : "Google Slides"

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUrlSubmit = () => {
    try {
      const url = new URL(urlInput)
      const pathParts = url.pathname.split('/')
      const docId = pathParts.find(part => part.length > 25)
      
      if (!docId) {
        setUrlError("No se pudo encontrar el ID del documento en la URL")
        return
      }

      const newDoc: Document = {
        id: docId,
        name: "Documento desde URL",
        iconUrl: type === "sheets" ? "/sheets-icon.png" : "/slides-icon.png",
        lastModified: new Date().toISOString().split('T')[0]
      }

      onSelect(newDoc)
      setOpen(false)
      setUrlInput("")
      setUrlError("")
    } catch (error) {
      setUrlError("URL inválida. Por favor, verifica el enlace")
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Box sx={{ my: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle1">{title}</Typography>
        </Box>
        <Button 
          variant="text"
          color="primary"
          onClick={() => setOpen(true)}
        >
          Seleccionar documento
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {selectedDoc ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img src={selectedDoc.iconUrl} alt="" style={{ width: 32, height: 32 }} />
              <Box>
                <Typography variant="subtitle2">{selectedDoc.name}</Typography>
                <Typography variant="caption" color="text.secondary">ID: {selectedDoc.id}</Typography>
              </Box>
            </Box>
            <Box>
              <IconButton
                size="small"
                color="primary"
                onClick={() => window.location.href = `/edit?doc=${selectedDoc.id}`}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onSelect({ ...selectedDoc, id: "" })}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center">
            No hay documento seleccionado
          </Typography>
        )}
      </Paper>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            Seleccionar {title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Elige un documento de la lista o pega el enlace directamente
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Lista de documentos" />
              <Tab label="Pegar enlace" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
                size="small"
              />
            </Box>

            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {filteredDocs.map((doc) => (
                <ListItem
                  key={doc.id}
                  button
                  onClick={() => {
                    onSelect(doc)
                    setOpen(false)
                  }}
                >
                  <ListItemIcon>
                    <img src={doc.iconUrl} alt="" style={{ width: 32, height: 32 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={doc.name}
                    secondary={`Última modificación: ${doc.lastModified}`}
                  />
                  {selectedDoc?.id === doc.id && (
                    <ListItemSecondaryAction>
                      <CheckIcon color="success" />
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TextField
              fullWidth
              label="URL del documento"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              error={!!urlError}
              helperText={urlError}
              InputProps={{
                startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />
              }}
            />
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          {tabValue === 1 && (
            <Button onClick={handleUrlSubmit} variant="contained" disabled={!urlInput}>
              Confirmar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
} 