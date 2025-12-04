#!/bin/bash
# Script para actualizar requirements.txt con versiones exactas
# Uso: bash update_requirements.sh

echo "Actualizando requirements.txt con versiones exactas del venv..."

# Activar virtualenv
source ./env/Scripts/activate

# Generar requirements con versiones exactas
pip freeze > requirements.txt

# Mostrar resultado
echo "✓ requirements.txt actualizado"
echo ""
echo "Contenido:"
cat requirements.txt
