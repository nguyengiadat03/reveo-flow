import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

interface NodeDeleteButtonProps {
  id: string;
}

export const NodeDeleteButton: React.FC<NodeDeleteButtonProps> = ({ id }) => {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <button className="icon-button danger nodrag" onClick={onDelete} title="Xóa node" type="button">
      <X size={15} />
    </button>
  );
};
