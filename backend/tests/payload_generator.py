from typing import Any, Dict, List, Type
from pydantic import BaseModel, create_model
import random

class PayloadGenerator:
    """Generates malicious/invalid payloads for negative testing based on Pydantic models."""

    @staticmethod
    def get_missing_field_payload(model: Type[BaseModel]) -> Dict[str, Any]:
        """Returns a copy of model fields with one required field missing."""
        fields = model.model_fields
        required_fields = [k for k, v in fields.items() if v.is_required()]
        
        if not required_fields:
            return {}
        
        # Generate valid data first
        payload = PayloadGenerator._generate_valid_mock(model)
        
        # Remove a random required field
        del payload[random.choice(required_fields)]
        return payload

    @staticmethod
    def get_invalid_type_payload(model: Type[BaseModel]) -> Dict[str, Any]:
        """Returns a payload with an incorrect type for a field."""
        payload = PayloadGenerator._generate_valid_mock(model)
        fields = list(payload.keys())
        if not fields:
            return payload
            
        target_field = random.choice(fields)
        # Inject invalid type (e.g., string for an int, or list for a string)
        payload[target_field] = {"invalid": "object"}
        return payload

    @staticmethod
    def _generate_valid_mock(model: Type[BaseModel]) -> Dict[str, Any]:
        """Basic mock generator to satisfy Pydantic structure."""
        # Simple heuristic: populate fields with basic dummy data
        mock_data = {}
        for name, field in model.model_fields.items():
            if field.is_required():
                if field.annotation == str:
                    mock_data[name] = "test_value"
                elif field.annotation == int:
                    mock_data[name] = 1
                elif field.annotation == float:
                    mock_data[name] = 1.0
                elif field.annotation == bool:
                    mock_data[name] = True
                else:
                    mock_data[name] = None
        return mock_data
