import React, { useRef, useEffect } from 'react';
import { Card } from 'react-bootstrap';

const NetworkVisualization = ({ locationData, numCEV }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !locationData || locationData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Color scheme
    const colors = {
      grid: '#2E86AB',      // Blue for grid nodes
      construction: '#A23B72', // Purple for construction sites
      ev: '#F18F01',        // Orange for EVs
      connection: '#C5C5C5', // Light gray for connections
      text: '#2C3E50'       // Dark blue for text
    };

    // Calculate positions for nodes in a circular layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    const nodePositions = locationData.map((_, index) => {
      const angle = (2 * Math.PI * index) / locationData.length;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Draw connections between all nodes (simplified network)
    ctx.strokeStyle = colors.connection;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed lines for connections
    
    for (let i = 0; i < locationData.length; i++) {
      for (let j = i + 1; j < locationData.length; j++) {
        ctx.beginPath();
        ctx.moveTo(nodePositions[i].x, nodePositions[i].y);
        ctx.lineTo(nodePositions[j].x, nodePositions[j].y);
        ctx.stroke();
      }
    }

    // Reset line style
    ctx.setLineDash([]);

    // Draw nodes
    locationData.forEach((location, index) => {
      const pos = nodePositions[index];
      const isGrid = location.type === 'grid';
      
      // Node circle
      ctx.fillStyle = isGrid ? colors.grid : colors.construction;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 25, 0, 2 * Math.PI);
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Node label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`N${location.id}`, pos.x, pos.y);
      
      // Node type indicator
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Arial';
      ctx.fillText(isGrid ? 'GRID' : 'CONST', pos.x, pos.y + 15);
    });

    // Draw EVs assigned to construction sites
    locationData.forEach((location, index) => {
      if (location.type === 'construction') {
        const pos = nodePositions[index];
        const assignedEVs = Object.entries(location.evAssignments || {})
          .filter(([evId, assigned]) => assigned === 1)
          .map(([evId]) => parseInt(evId));

        if (assignedEVs.length > 0) {
          // Draw EVs around the construction site
          assignedEVs.forEach((evId, evIndex) => {
            const evAngle = (2 * Math.PI * evIndex) / Math.max(assignedEVs.length, 1);
            const evRadius = 40;
            const evX = pos.x + evRadius * Math.cos(evAngle);
            const evY = pos.y + evRadius * Math.sin(evAngle);
            
            // EV circle
            ctx.fillStyle = colors.ev;
            ctx.beginPath();
            ctx.arc(evX, evY, 15, 0, 2 * Math.PI);
            ctx.fill();
            
            // EV border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // EV label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`EV${evId}`, evX, evY);
            
            // Connection line from EV to construction site
            ctx.strokeStyle = colors.ev;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(evX, evY);
            ctx.stroke();
          });
        }
      }
    });

    // Draw legend
    const legendX = 20;
    const legendY = 20;
    const legendItemHeight = 25;
    
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Network Topology', legendX, legendY);
    
    // Grid node legend
    ctx.fillStyle = colors.grid;
    ctx.beginPath();
    ctx.arc(legendX + 10, legendY + 35, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.font = '12px Arial';
    ctx.fillText('Grid Node', legendX + 25, legendY + 40);
    
    // Construction site legend
    ctx.fillStyle = colors.construction;
    ctx.beginPath();
    ctx.arc(legendX + 10, legendY + 60, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.fillText('Construction Site', legendX + 25, legendY + 65);
    
    // EV legend
    ctx.fillStyle = colors.ev;
    ctx.beginPath();
    ctx.arc(legendX + 10, legendY + 85, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.fillText('Electric Vehicle (CEV)', legendX + 25, legendY + 90);

  }, [locationData, numCEV]);

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">🗺️ Network Topology Visualization</h5>
      </Card.Header>
      <Card.Body>
        <div className="text-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{ 
              border: '1px solid #dee2e6', 
              borderRadius: '8px',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
          <div className="mt-3">
            <small className="text-muted">
              This visualization shows the network topology with grid nodes (blue), construction sites (purple), 
              and assigned electric vehicles (orange). Dashed lines represent possible connections between nodes.
            </small>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default NetworkVisualization;



