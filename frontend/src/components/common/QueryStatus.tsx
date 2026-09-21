export default function QueryStatus({query}:{query:{isPending:boolean;error:Error|null;refetch:()=>unknown}}){
  if(query.isPending)return <p role="status">Loading…</p>;
  if(query.error)return <div role="alert" className="form-error"><p>{query.error.message}</p><button className="secondary" onClick={()=>query.refetch()}>Try again</button></div>;
  return null;
}

