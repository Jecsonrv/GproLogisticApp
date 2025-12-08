import React from 'react';
import { useParams } from 'react-router-dom';

function ServiceOrderDetail() {
  const { id } = useParams();
  return (
    <div>
      <h1>Service Order Detail - {id}</h1>
      <p>Details for service order {id} will go here.</p>
    </div>
  );
}

export default ServiceOrderDetail;
