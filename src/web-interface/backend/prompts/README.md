# Sistema de Prompts y Agentes - MCS-CEV Optimization

## 📋 **Arquitectura del Sistema Multi-Agente**

### 🤖 **Agentes Principales**

#### 1. **Understanding Agent** (`understanding-agent.md`)
- **Propósito**: Extrae parámetros del lenguaje natural
- **Entrada**: Mensaje del usuario + contexto
- **Salida**: Parámetros estructurados con confianza
- **Interacción**: Se ejecuta primero, alimenta a Validation Agent

#### 2. **Validation Agent** (`validation-agent.md`)
- **Propósito**: Valida parámetros extraídos
- **Entrada**: Parámetros del Understanding Agent + contexto
- **Salida**: Resultado de validación con issues y sugerencias
- **Interacción**: Recibe datos del Understanding Agent, alimenta al Recommendation Agent

#### 3. **Recommendation Agent** (`recommendation-agent.md`)
- **Propósito**: Proporciona recomendaciones contextuales
- **Entrada**: Parámetros + validación + contexto
- **Salida**: Recomendaciones específicas con razonamiento
- **Interacción**: Se activa cuando hay issues o el usuario pide recomendaciones

#### 4. **Conversation Manager** (`conversation-manager.md`)
- **Propósito**: Genera respuestas conversacionales naturales
- **Entrada**: Todos los resultados de los agentes anteriores
- **Salida**: Respuesta natural + navegación automática
- **Interacción**: Coordina todos los agentes, maneja la navegación

### 🔄 **Flujo de Interacción**

```
User Input → Understanding Agent → Validation Agent → Recommendation Agent → Conversation Manager → Response
     ↓              ↓                    ↓                    ↓                      ↓
  Context    Extracted Params    Validation Result    Recommendations    Natural Response + Navigation
```

## 📁 **Estructura de Archivos de Prompts**

### **Archivos Existentes:**
- `understanding-agent.md` - Extracción de parámetros
- `validation-agent.md` - Validación de datos
- `recommendation-agent.md` - Recomendaciones contextuales
- `conversation-manager.md` - Gestión de conversación
- `parameter-extractor.md` - (Legacy) Extracción específica de parámetros
- `parameter-validator.md` - (Legacy) Validación específica de parámetros

### **Archivos Planificados:**
- `navigation-agent.md` - Navegación automática entre pasos
- `context-manager.md` - Gestión de contexto de conversación
- `error-handler.md` - Manejo de errores y recuperación
- `optimization-agent.md` - Agente especializado en optimización

## 🛠️ **Sistema de Gestión de Prompts**

### **Carga Automática:**
```javascript
// Los prompts se cargan automáticamente al inicializar PromptManager
const promptManager = new PromptManager();
// Carga todos los archivos .md del directorio prompts/
```

### **Variables de Contexto:**
Cada prompt puede usar variables dinámicas:
- `{userInput}` - Mensaje del usuario
- `{currentStep}` - Paso actual de la interfaz
- `{formData}` - Datos del formulario actual
- `{conversationHistory}` - Historial de conversación
- `{workflowState}` - Estado del flujo de trabajo

### **Validación de Prompts:**
```bash
# Verificar que todos los prompts se cargan correctamente
node test-prompt-loading.js

# Verificar que las variables se reemplazan correctamente
node test-prompt-variables.js
```

## 📊 **Documentación de Agentes**

### **Understanding Agent**
**Archivo**: `understanding-agent.md`
**Responsabilidades**:
- Extraer parámetros de escenario (MCS, CEV, nodos)
- Extraer parámetros técnicos (eficiencia, capacidades)
- Extraer datos de vehículos eléctricos
- Extraer información de ubicaciones
- Calcular confianza de extracción

**Variables de Entrada**:
- `{userInput}` - Mensaje del usuario
- `{currentContext}` - Contexto actual
- `{conversationHistory}` - Historial de conversación
- `{workflowState}` - Estado del flujo

**Formato de Salida**:
```json
{
  "scenario": { "numMCS": 2, "numCEV": 3, ... },
  "parameters": { "eta_ch_dch": 0.95, ... },
  "evData": [...],
  "extraction_confidence": 0.9,
  "missing_critical_info": [...],
  "suggestions": [...]
}
```

### **Validation Agent**
**Archivo**: `validation-agent.md`
**Responsabilidades**:
- Validar rangos de parámetros
- Verificar consistencia de datos
- Detectar parámetros faltantes
- Calcular puntuación de validación

**Variables de Entrada**:
- `{extractedParameters}` - Parámetros extraídos
- `{userInput}` - Mensaje original del usuario
- `{currentConfiguration}` - Configuración actual
- `{workflowState}` - Estado del flujo

**Formato de Salida**:
```json
{
  "is_valid": true,
  "validation_score": 0.95,
  "completeness": { "scenario": 1, "parameters": 1, "overall": 1 },
  "range_validation": { "passed": true, "issues": [] },
  "consistency_check": { "passed": true, "issues": [] },
  "missing_parameters": [],
  "suggestions": []
}
```

### **Recommendation Agent**
**Archivo**: `recommendation-agent.md`
**Responsabilidades**:
- Proporcionar recomendaciones contextuales
- Sugerir mejoras basadas en validación
- Recomendar valores óptimos
- Explicar razonamiento de recomendaciones

**Variables de Entrada**:
- `{userInput}` - Mensaje del usuario
- `{extractedParameters}` - Parámetros extraídos
- `{validationResult}` - Resultado de validación
- `{workflowState}` - Estado del flujo

**Formato de Salida**:
```json
{
  "recommendations": [
    {
      "type": "parameter",
      "parameter": "MCS_max",
      "current_value": 1000,
      "recommended_value": 800,
      "reasoning": "800 kWh provides optimal capacity...",
      "confidence": 0.9,
      "priority": "high"
    }
  ],
  "confidence": 0.9,
  "context": "Recommendations for construction EV optimization"
}
```

### **Conversation Manager**
**Archivo**: `conversation-manager.md`
**Responsabilidades**:
- Generar respuestas conversacionales naturales
- Coordinar navegación automática entre pasos
- Mantener contexto de conversación
- Proporcionar guía proactiva

**Variables de Entrada**:
- `{extractedParameters}` - Parámetros extraídos
- `{validationResult}` - Resultado de validación
- `{recommendationResult}` - Recomendaciones
- `{workflowState}` - Estado del flujo
- `{conversationHistory}` - Historial de conversación

**Formato de Salida**:
- Respuesta natural en texto
- Navegación automática a siguiente paso
- Acciones realizadas
- Actualizaciones del formulario

## 🔧 **Agregar Nuevos Agentes**

### **Paso 1: Crear el archivo de prompt**
```bash
# Crear nuevo archivo de prompt
touch backend/prompts/navigation-agent.md
```

### **Paso 2: Documentar el agente**
```markdown
# Navigation Agent Prompt

## Propósito
[Descripción del propósito del agente]

## Variables de Entrada
- `{variable1}` - Descripción
- `{variable2}` - Descripción

## Formato de Salida
```json
{
  "output_field": "description"
}
```

## Interacciones
- Recibe datos de: [Agente anterior]
- Alimenta a: [Agente siguiente]
```

### **Paso 3: Agregar al AgentOrchestrator**
```javascript
// En agentOrchestrator.js
async navigationAgent(input, context) {
  const prompt = promptManager.getNavigationAgentPrompt(input, context);
  // Implementar lógica del agente
}
```

### **Paso 4: Actualizar el flujo principal**
```javascript
// En processMessage()
const navigationResult = await this.navigationAgent(message, context, workflowState);
```

### **Paso 5: Crear test específico**
```javascript
// test-navigation-agent.js
console.log('🧪 Testing Navigation Agent');
// Implementar pruebas específicas
```

## 📈 **Métricas y Monitoreo**

### **Métricas por Agente:**
- **Understanding Agent**: Confianza de extracción, parámetros extraídos
- **Validation Agent**: Puntuación de validación, issues detectados
- **Recommendation Agent**: Número de recomendaciones, confianza
- **Conversation Manager**: Navegación automática, satisfacción del usuario

### **Logs de Interacción:**
```javascript
console.log(`🧠 Understanding Agent: ${extraction_confidence}`);
console.log(`✅ Validation Agent: ${validation_score}`);
console.log(`💡 Recommendation Agent: ${recommendations_count}`);
console.log(`🚀 Navigation: Step ${currentStep} → ${nextStep}`);
```

## 🔄 **Mantenimiento y Actualización**

### **Verificación Regular:**
```bash
# Verificar carga de prompts
node test-prompt-loading.js

# Verificar flujo completo
node test-multi-agent.js

# Verificar navegación automática
node test-auto-navigation.js

# Verificar sistema completo
node test-complete-system.js
```

### **Actualización de Prompts:**
1. Editar archivo `.md` correspondiente
2. Ejecutar test específico del agente
3. Verificar flujo completo
4. Documentar cambios en este README

### **Agregar Nuevos Agentes:**
1. Crear archivo de prompt
2. Documentar en este README
3. Implementar en AgentOrchestrator
4. Crear tests específicos
5. Verificar integración completa

---

**Última actualización**: Agosto 2025
**Versión**: 1.0
**Estado**: ✅ Implementado y funcionando
