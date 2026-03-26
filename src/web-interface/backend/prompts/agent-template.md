# [Agent Name] Agent Prompt Template

## 🎯 **Propósito**
[Descripción clara del propósito del agente]

## 📥 **Variables de Entrada**
- `{userInput}` - Mensaje del usuario
- `{extractedParameters}` - Parámetros extraídos por Understanding Agent
- `{validationResult}` - Resultado de validación (si aplica)
- `{currentContext}` - Contexto actual de la conversación
- `{conversationHistory}` - Historial de conversación
- `{workflowState}` - Estado del flujo de trabajo

## 📤 **Formato de Salida**
```json
{
  "output_field_1": "description",
  "output_field_2": "description",
  "confidence": 0.9,
  "missing_info": ["list of missing information"],
  "suggestions": ["list of suggestions"]
}
```

## 🔄 **Interacciones**
- **Recibe datos de**: [Nombre del agente anterior]
- **Alimenta a**: [Nombre del agente siguiente]
- **Se ejecuta cuando**: [Condiciones de ejecución]

## 📋 **Responsabilidades Específicas**
1. [Responsabilidad 1]
2. [Responsabilidad 2]
3. [Responsabilidad 3]

## 🎯 **Ejemplos de Uso**

### Ejemplo 1: [Caso de uso típico]
**Entrada**: [Descripción de la entrada]
**Salida**: [Descripción de la salida esperada]

### Ejemplo 2: [Caso de uso alternativo]
**Entrada**: [Descripción de la entrada]
**Salida**: [Descripción de la salida esperada]

## ⚠️ **Manejo de Errores**
- Si [condición de error], entonces [acción a tomar]
- Si [otra condición de error], entonces [otra acción]

## 🔧 **Configuración**
- **Modelo**: gpt-3.5-turbo
- **Temperatura**: 0.1 (para respuestas consistentes)
- **Max tokens**: [número apropiado]
- **Formato de respuesta**: JSON estructurado

## 📝 **Notas de Implementación**
- [Nota importante 1]
- [Nota importante 2]
- [Consideraciones especiales]

---

**Archivo**: `[agent-name].md`
**Versión**: 1.0
**Última actualización**: [Fecha]
**Estado**: [Draft/Ready/Deprecated]
