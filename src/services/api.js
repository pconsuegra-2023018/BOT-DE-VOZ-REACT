import axios from 'axios';

const api = axios.create(
    {
        baseURL: 'http://localhost:3000/api/documents',
        timeout: 2000,
    }
);

export const getDocuments = async () => {
    try{
        return await api.get('/knowledge-bases');
    } catch (error) {
        console.error('Error fetching documents:', error);
        return{
            error:true,
            error
        }
    }
}

export const createDocument = async (document) => {
    try{
        return await api.post('/knowledge-base', document);
    } catch (error) {
        console.error('Error creating document:', error);
        return{
            error:true,
            error
        }
    }
}

export const deleteDocumentRequest = async (documentId) => {
    try{
        return await api.delete(`/knowledge-base/${documentId}`);
    }catch(err){
        console.error('Error deleting document:', err);
        return{
            error:true,
            error
        }
    }

}

export const updateDocumentRequest = async (updatedDocument) => {
    try{
        return await api.put(`/upload-multiple`, updatedDocument);
    } catch (error) {
        console.error('Error updating document:', error);
        return{
            error:true,
            error
        }
    }
}