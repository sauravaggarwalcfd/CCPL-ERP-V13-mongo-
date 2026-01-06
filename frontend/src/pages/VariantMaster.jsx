/**
 * Variant Master - Main Page
 * Unified master for managing Colours, Sizes, UOMs and Special Attributes with tabs
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Palette, Ruler, Scale, Settings } from 'lucide-react';
import ColourMaster from '../components/variant-master/ColourMaster';
import SizeMaster from '../components/variant-master/SizeMaster';
import UOMMaster from '../components/variant-master/UOMMaster';
import SpecialAttributesTab from '../components/variant-master/SpecialAttributesTab';

const VariantMaster = () => {
  const { setTitle } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get tab from URL query parameter or default to 'colours'
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return ['colours', 'sizes', 'uoms', 'attributes'].includes(tab) ? tab : 'colours';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    setTitle('Variant Master');
  }, [setTitle]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/variant-master?tab=${tab}`, { replace: true });
  };

  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['colours', 'sizes', 'uoms', 'attributes'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
      {/* Sticky Top Bar */}
      <div className="bg-white p-4 border-b sticky top-0 z-10">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
          <TabsTrigger value="attributes" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Attributes</span>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <TabsContent value="colours" className="mt-0">
            <ColourMaster />
          </TabsContent>

          <TabsContent value="sizes" className="mt-0">
            <SizeMaster />
          </TabsContent>

          <TabsContent value="uoms" className="mt-0">
            <UOMMaster />
          </TabsContent>

          <TabsContent value="attributes" className="mt-0">
            <SpecialAttributesTab />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
};

export default VariantMaster;
