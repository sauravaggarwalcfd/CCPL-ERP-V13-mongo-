"""
SKU (Stock Keeping Unit) Generation Service
Generates SKU based on the structure: FM-ABCD-A0000-0000-00

SKU Components:
1. Item Type Code (2 letters): FM - made in item type creation
2. Category Code (2-4 letters): ABCD - based on last level, made in category creation
3. Item Sequence (1 letter + 4 digits): A0000 - unique for every item type, auto-increment
4. First Variant (4 chars): 0000 - based on primary variant (color) in item creation
5. Second Variant (2 chars): 00 - based on secondary variant (size/uom) in item creation
"""

from typing import Optional, List
from datetime import datetime
import string
import logging

logger = logging.getLogger(__name__)


class SKUService:
    """Service for generating and managing SKUs"""

    @staticmethod
    def generate_item_type_code(type_name: str) -> str:
        """
        Generate 2-letter item type code from type name
        Examples: 
        - Finished Goods -> FG
        - Raw Material -> RM
        - Accessories -> AC
        """
        # Remove spaces and take first 2 letters, uppercase
        words = type_name.upper().split()
        
        if len(words) >= 2:
            # Use first letter of each of first two words
            code = words[0][0] + words[1][0]
        else:
            # Use first two letters
            code = (type_name.upper().replace(" ", "")[:2]).ljust(2, 'X')
        
        return code[:2]

    @staticmethod
    def generate_category_code(level_name: str, level: int = 5) -> str:
        """
        Generate category code from level name (2-4 letters)
        Uses first letters of each word or first N characters
        
        Examples:
        - Men's Apparel -> MNAPL or MA
        - Formal Wear -> FW or FRML
        - T-Shirts -> TS or TSHT
        """
        clean_name = level_name.upper().replace("-", " ").replace("_", " ")
        words = clean_name.split()
        
        if len(words) >= 2:
            # Use first letter of each word up to 4 chars
            code = "".join([w[0] for w in words])[:4]
        else:
            # Use first N letters (2-4)
            code = clean_name.replace(" ", "")[:4]
        
        return code.ljust(2, 'X')[:4]  # Pad to at least 2, max 4

    @staticmethod
    def generate_item_sequence_code(item_count: int, type_code: str = "") -> str:
        """
        Generate item sequence code: 1 letter + 4 digits
        Example: A0001, B0001, A0002
        
        Letter cycles through A-Z based on thousands (A=0-999, B=1000-1999, etc)
        Digits cycle through 0001-9999
        """
        # Calculate letter and number
        letter_index = (item_count // 10000) % 26
        sequence_letter = string.ascii_uppercase[letter_index]
        sequence_number = (item_count % 10000) + 1
        
        return f"{sequence_letter}{sequence_number:04d}"

    @staticmethod
    def generate_variant_code(
        variant_name: Optional[str],
        variant_type: str = "color",
        max_length: int = 4
    ) -> str:
        """
        Generate variant code from variant name
        
        For Color (primary variant): 4 characters max
        For Size/UOM (secondary variant): 2 characters max
        
        Examples:
        - Red -> R000, BLUE -> BL00, Navy Blue -> NB00
        - Medium -> M0, Large -> L0, Small -> SM
        """
        if not variant_name:
            return "0" * max_length
        
        clean_name = variant_name.upper().replace(" ", "").replace("-", "")
        
        if max_length == 4:
            # For color: try to use meaningful abbreviation
            if len(clean_name) <= 1:
                return clean_name.ljust(4, "0")
            elif len(clean_name) <= 4:
                return (clean_name + "0" * 4)[:4]
            else:
                # Use first + vowel compression
                return (clean_name[:2] + clean_name[2:].replace('E', '').replace('A', '').replace('I', '').replace('O', '').replace('U', ''))[:4].ljust(4, "0")
        else:
            # For size/uom: 2 characters max
            return (clean_name[:2]).ljust(2, "0")

    @staticmethod
    def construct_sku(
        item_type_code: str,
        category_code: str,
        item_sequence: str,
        primary_variant: str = "0000",
        secondary_variant: str = "00"
    ) -> str:
        """
        Construct full SKU from components
        Format: FM-ABCD-A0000-0000-00
        """
        # Ensure proper formatting
        item_type_code = str(item_type_code).upper()[:2].ljust(2, 'X')
        category_code = str(category_code).upper()[:4].ljust(2, 'X')
        item_sequence = str(item_sequence).upper()[:5].ljust(5, '0')
        primary_variant = str(primary_variant).upper()[:4].ljust(4, '0')
        secondary_variant = str(secondary_variant).upper()[:2].ljust(2, '0')
        
        return f"{item_type_code}-{category_code}-{item_sequence}-{primary_variant}-{secondary_variant}"

    @staticmethod
    def parse_sku(sku: str) -> dict:
        """
        Parse SKU string and extract components
        """
        parts = sku.split('-')
        if len(parts) != 5:
            return None
        
        return {
            'item_type_code': parts[0],
            'category_code': parts[1],
            'item_sequence': parts[2],
            'primary_variant': parts[3],
            'secondary_variant': parts[4],
            'full_sku': sku
        }

    @staticmethod
    def get_sku_display(sku: str) -> dict:
        """
        Get formatted SKU display with component labels
        """
        parsed = SKUService.parse_sku(sku)
        if not parsed:
            return None
        
        return {
            'full': sku,
            'type': f"Type: {parsed['item_type_code']}",
            'category': f"Category: {parsed['category_code']}",
            'sequence': f"Item: {parsed['item_sequence']}",
            'variant1': f"Variant1: {parsed['primary_variant']}",
            'variant2': f"Variant2: {parsed['secondary_variant']}",
            'formatted': (
                f"{parsed['item_type_code']}<br>"
                f"{parsed['category_code']}<br>"
                f"{parsed['item_sequence']}<br>"
                f"{parsed['primary_variant']}<br>"
                f"{parsed['secondary_variant']}"
            )
        }


# Helper function for common SKU generation in services
def generate_complete_sku(
    item_type_code: str,
    category_code: str,
    item_count: int,
    color_name: Optional[str] = None,
    size_name: Optional[str] = None
) -> str:
    """
    Convenience function to generate complete SKU
    """
    item_seq = SKUService.generate_item_sequence_code(item_count, item_type_code)
    variant1 = SKUService.generate_variant_code(color_name, "color", 4)
    variant2 = SKUService.generate_variant_code(size_name, "size", 2)
    
    return SKUService.construct_sku(
        item_type_code,
        category_code,
        item_seq,
        variant1,
        variant2
    )
