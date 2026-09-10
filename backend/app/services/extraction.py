import re
from typing import List, Dict

def extract_entities(text: str) -> List[Dict]:
    """
    Mock NER and Rule-based Extraction Service.
    Extracts Persons (capitalized words), Phones, and Vehicles.
    """
    entities = []
    
    # 1. Phone Numbers (10 digits)
    phone_pattern = r'\b\d{10}\b'
    phones = re.findall(phone_pattern, text)
    for p in phones:
        entities.append({"type": "PHONE", "value": p, "confidence": 0.95})
        
    # 2. Vehicle Numbers (e.g. WB 12 AB 1234)
    vehicle_pattern = r'\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}\b'
    vehicles = re.findall(vehicle_pattern, text)
    for v in vehicles:
        # Simple normalization: remove spaces and hyphens
        normalized = re.sub(r'[-\s]', '', v).upper()
        entities.append({"type": "VEHICLE", "value": v, "normalized_value": normalized, "confidence": 0.85})
        
    # 3. Persons (Simple heuristic: Two capitalized words)
    # WARNING: Very basic heuristic for MVP
    person_pattern = r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
    persons = set(re.findall(person_pattern, text))
    for person in persons:
        entities.append({"type": "PERSON", "value": person, "confidence": 0.70})
        
    return entities
