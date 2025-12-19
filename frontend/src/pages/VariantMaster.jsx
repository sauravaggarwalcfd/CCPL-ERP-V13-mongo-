/**
 * Variant Master - Main Page
 * Unified master for managing Colours, Sizes, and UOMs with tabs
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Palette, Ruler, Scale } from 'lucide-react';
import ColourMaster from '../components/variant-master/ColourMaster';
import SizeMaster from '../components/variant-master/SizeMaster';
import UOMMaster from '../components/variant-master/UOMMaster';

const VariantMaster = () => {
  const [activeTab, setActiveTab] = useState('colours');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Variant Master</h1>
          <p className="text-gray-600 mt-2">
            Manage product variants: colours, sizes, and units of measure
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="colours" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span>Colours</span>
            </TabsTrigger>
            <TabsTrigger value="sizes" className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <span>Sizes</span>
            </TabsTrigger>
            <TabsTrigger value="uoms" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>UOM</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colours" className="mt-0">
            <ColourMaster />
          </TabsContent>

          <TabsContent value="sizes" className="mt-0">
            <SizeMaster />
          </TabsContent>

          <TabsContent value="uoms" className="mt-0">
            <UOMMaster />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VariantMaster;
