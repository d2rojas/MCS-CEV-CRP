import React from 'react';
import InteractiveChartViewer from './InteractiveChartViewer';

const ChartViewer = ({ charts }) => {
  console.log('📈 ChartViewer received charts:', charts?.length || 0);
  console.log('📈 ChartViewer charts data:', charts);
  return <InteractiveChartViewer charts={charts} />;
};

export default ChartViewer;
