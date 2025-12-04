from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from cuentas.models import Agente
from rest_framework.permissions import AllowAny
from cuentas.serializers import AgenteSerializer
from django.db import transaction


class AgenteCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AgenteSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():  # Transacción atómica
                    serializer.save()
                return Response(
                    {"message": "Agente creado correctamente", "data": serializer.data},
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)